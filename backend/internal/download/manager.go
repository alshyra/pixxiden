package download

import (
	"bufio"
	"context"
	"fmt"
	"os/exec"
	"regexp"
	"strconv"
	"sync"
	"time"
)

// Status represents the download status
type Status string

const (
	StatusQueued      Status = "queued"
	StatusDownloading Status = "downloading"
	StatusInstalling  Status = "installing"
	StatusVerifying   Status = "verifying"
	StatusCompleted   Status = "completed"
	StatusPaused      Status = "paused"
	StatusCancelled   Status = "cancelled"
	StatusFailed      Status = "failed"
)

// Task represents a download task
type Task struct {
	ID           string    `json:"id"`
	GameID       string    `json:"game_id"`
	GameTitle    string    `json:"game_title"`
	StoreID      string    `json:"store_id"`
	InstallPath  string    `json:"install_path"`
	Status       Status    `json:"status"`
	Progress     float64   `json:"progress"`
	Downloaded   int64     `json:"downloaded"`
	TotalSize    int64     `json:"total_size"`
	Speed        int64     `json:"speed"`
	ETA          int64     `json:"eta"`
	Error        string    `json:"error,omitempty"`
	StartedAt    time.Time `json:"started_at"`
	CompletedAt  time.Time `json:"completed_at,omitempty"`

	cmd    *exec.Cmd
	cancel context.CancelFunc
}

// Manager handles download queue and progress tracking
type Manager struct {
	tasks      map[string]*Task
	queue      []*Task
	mu         sync.RWMutex
	maxWorkers int

	// Progress update channel
	updates chan *Task

	// Store-specific command builders
	cmdBuilders map[string]CommandBuilder
}

// CommandBuilder builds the install command for a store
type CommandBuilder func(gameID, installPath string) *exec.Cmd

// NewManager creates a new download manager
func NewManager(maxWorkers int) *Manager {
	if maxWorkers <= 0 {
		maxWorkers = 2
	}

	m := &Manager{
		tasks:       make(map[string]*Task),
		queue:       make([]*Task, 0),
		maxWorkers:  maxWorkers,
		updates:     make(chan *Task, 100),
		cmdBuilders: make(map[string]CommandBuilder),
	}

	// Start the queue processor
	go m.processQueue()

	return m
}

// RegisterStore registers a command builder for a store
func (m *Manager) RegisterStore(storeID string, builder CommandBuilder) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.cmdBuilders[storeID] = builder
}

// QueueDownload adds a new download to the queue
func (m *Manager) QueueDownload(gameID, gameTitle, storeID, installPath string) (*Task, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	taskID := fmt.Sprintf("%s-%s-%d", storeID, gameID, time.Now().UnixNano())

	// Check if already downloading
	for _, task := range m.tasks {
		if task.GameID == gameID && task.StoreID == storeID && 
		   (task.Status == StatusQueued || task.Status == StatusDownloading) {
			return nil, fmt.Errorf("game already in download queue")
		}
	}

	task := &Task{
		ID:          taskID,
		GameID:      gameID,
		GameTitle:   gameTitle,
		StoreID:     storeID,
		InstallPath: installPath,
		Status:      StatusQueued,
		Progress:    0,
	}

	m.tasks[taskID] = task
	m.queue = append(m.queue, task)

	return task, nil
}

// GetTask returns a task by ID
func (m *Manager) GetTask(taskID string) (*Task, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return nil, fmt.Errorf("task not found: %s", taskID)
	}

	return task, nil
}

// GetAllTasks returns all tasks
func (m *Manager) GetAllTasks() []*Task {
	m.mu.RLock()
	defer m.mu.RUnlock()

	tasks := make([]*Task, 0, len(m.tasks))
	for _, task := range m.tasks {
		tasks = append(tasks, task)
	}

	return tasks
}

// GetQueuedTasks returns queued and active tasks
func (m *Manager) GetQueuedTasks() []*Task {
	m.mu.RLock()
	defer m.mu.RUnlock()

	tasks := make([]*Task, 0)
	for _, task := range m.tasks {
		if task.Status == StatusQueued || task.Status == StatusDownloading || 
		   task.Status == StatusInstalling || task.Status == StatusVerifying {
			tasks = append(tasks, task)
		}
	}

	return tasks
}

// PauseTask pauses a download task
func (m *Manager) PauseTask(taskID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return fmt.Errorf("task not found: %s", taskID)
	}

	if task.Status != StatusDownloading {
		return fmt.Errorf("can only pause downloading tasks")
	}

	if task.cancel != nil {
		task.cancel()
	}

	task.Status = StatusPaused
	m.sendUpdate(task)

	return nil
}

// ResumeTask resumes a paused download
func (m *Manager) ResumeTask(taskID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return fmt.Errorf("task not found: %s", taskID)
	}

	if task.Status != StatusPaused {
		return fmt.Errorf("can only resume paused tasks")
	}

	task.Status = StatusQueued
	m.queue = append(m.queue, task)
	m.sendUpdate(task)

	return nil
}

// CancelTask cancels a download task
func (m *Manager) CancelTask(taskID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return fmt.Errorf("task not found: %s", taskID)
	}

	if task.cancel != nil {
		task.cancel()
	}

	task.Status = StatusCancelled
	m.sendUpdate(task)

	// Remove from queue
	for i, t := range m.queue {
		if t.ID == taskID {
			m.queue = append(m.queue[:i], m.queue[i+1:]...)
			break
		}
	}

	return nil
}

// RemoveTask removes a completed/failed/cancelled task
func (m *Manager) RemoveTask(taskID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	task, ok := m.tasks[taskID]
	if !ok {
		return fmt.Errorf("task not found: %s", taskID)
	}

	if task.Status == StatusDownloading || task.Status == StatusQueued {
		return fmt.Errorf("cannot remove active task")
	}

	delete(m.tasks, taskID)
	return nil
}

// Updates returns the update channel
func (m *Manager) Updates() <-chan *Task {
	return m.updates
}

// processQueue processes the download queue
func (m *Manager) processQueue() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()

	for range ticker.C {
		m.mu.Lock()
		
		// Count active downloads
		active := 0
		for _, task := range m.tasks {
			if task.Status == StatusDownloading || task.Status == StatusInstalling {
				active++
			}
		}

		// Start new downloads if under limit
		for active < m.maxWorkers && len(m.queue) > 0 {
			task := m.queue[0]
			m.queue = m.queue[1:]

			if task.Status == StatusQueued {
				go m.startDownload(task)
				active++
			}
		}

		m.mu.Unlock()
	}
}

// startDownload starts downloading a task
func (m *Manager) startDownload(task *Task) {
	m.mu.Lock()
	builder, ok := m.cmdBuilders[task.StoreID]
	m.mu.Unlock()

	if !ok {
		task.Status = StatusFailed
		task.Error = fmt.Sprintf("no command builder for store: %s", task.StoreID)
		m.sendUpdate(task)
		return
	}

	ctx, cancel := context.WithCancel(context.Background())
	task.cancel = cancel
	task.Status = StatusDownloading
	task.StartedAt = time.Now()
	m.sendUpdate(task)

	cmd := builder(task.GameID, task.InstallPath)
	cmd = exec.CommandContext(ctx, cmd.Path, cmd.Args[1:]...)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		task.Status = StatusFailed
		task.Error = err.Error()
		m.sendUpdate(task)
		return
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		task.Status = StatusFailed
		task.Error = err.Error()
		m.sendUpdate(task)
		return
	}

	if err := cmd.Start(); err != nil {
		task.Status = StatusFailed
		task.Error = err.Error()
		m.sendUpdate(task)
		return
	}

	task.cmd = cmd

	// Parse progress from stdout/stderr
	go m.parseProgress(task, bufio.NewScanner(stdout))
	go m.parseProgress(task, bufio.NewScanner(stderr))

	// Wait for completion
	err = cmd.Wait()

	m.mu.Lock()
	if ctx.Err() == context.Canceled {
		// Task was cancelled/paused
		m.mu.Unlock()
		return
	}
	m.mu.Unlock()

	if err != nil {
		task.Status = StatusFailed
		task.Error = err.Error()
	} else {
		task.Status = StatusCompleted
		task.Progress = 100
		task.CompletedAt = time.Now()
	}

	m.sendUpdate(task)
}

// parseProgress parses progress from CLI output
func (m *Manager) parseProgress(task *Task, scanner *bufio.Scanner) {
	// Progress patterns for different CLIs
	// Legendary: "Progress: 45.67% (123.45/267.89 MiB), Running for: 00:01:23, ETA: 00:02:34"
	// GOGdl: "45.67% [###########     ] 123.45 MiB/267.89 MiB"
	// Nile: "Downloading: 45.67% (123.45/267.89 MB) @ 12.34 MB/s ETA: 00:02:34"

	progressRe := regexp.MustCompile(`(\d+\.?\d*)%`)
	speedRe := regexp.MustCompile(`(\d+\.?\d*)\s*(KB|MB|GB|MiB|GiB)/s`)
	etaRe := regexp.MustCompile(`ETA:?\s*(\d+):(\d+):(\d+)`)
	sizeRe := regexp.MustCompile(`(\d+\.?\d*)\s*/\s*(\d+\.?\d*)\s*(KB|MB|GB|MiB|GiB)`)

	for scanner.Scan() {
		line := scanner.Text()

		// Parse progress percentage
		if matches := progressRe.FindStringSubmatch(line); len(matches) > 1 {
			if progress, err := strconv.ParseFloat(matches[1], 64); err == nil {
				task.Progress = progress
			}
		}

		// Parse download speed
		if matches := speedRe.FindStringSubmatch(line); len(matches) > 2 {
			if speed, err := strconv.ParseFloat(matches[1], 64); err == nil {
				multiplier := int64(1)
				switch matches[2] {
				case "KB":
					multiplier = 1024
				case "MB", "MiB":
					multiplier = 1024 * 1024
				case "GB", "GiB":
					multiplier = 1024 * 1024 * 1024
				}
				task.Speed = int64(speed * float64(multiplier))
			}
		}

		// Parse ETA
		if matches := etaRe.FindStringSubmatch(line); len(matches) > 3 {
			hours, _ := strconv.ParseInt(matches[1], 10, 64)
			minutes, _ := strconv.ParseInt(matches[2], 10, 64)
			seconds, _ := strconv.ParseInt(matches[3], 10, 64)
			task.ETA = hours*3600 + minutes*60 + seconds
		}

		// Parse sizes
		if matches := sizeRe.FindStringSubmatch(line); len(matches) > 3 {
			downloaded, _ := strconv.ParseFloat(matches[1], 64)
			total, _ := strconv.ParseFloat(matches[2], 64)
			multiplier := float64(1)
			switch matches[3] {
			case "KB":
				multiplier = 1024
			case "MB", "MiB":
				multiplier = 1024 * 1024
			case "GB", "GiB":
				multiplier = 1024 * 1024 * 1024
			}
			task.Downloaded = int64(downloaded * multiplier)
			task.TotalSize = int64(total * multiplier)
		}

		// Send update
		m.sendUpdate(task)
	}
}

// sendUpdate sends a task update
func (m *Manager) sendUpdate(task *Task) {
	select {
	case m.updates <- task:
	default:
		// Channel full, skip update
	}
}
