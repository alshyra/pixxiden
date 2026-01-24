/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ReMiX Theme Colors (Jono Sellier - Pitch Black with Neon Indigo)
        'remix': {
          'black': '#050505',          // Vrai noir (pour backgrounds)
          'bg-dark': '#000000',        // Pure Black
          'bg-panel': '#0f0f12',       // AJOUTÉ : Sidebar background
          'bg-card': '#0a0a0a',        // Dark Grey
          'bg-content': '#141419',     // AJOUTÉ : Main content background
          'bg-hover': '#2A2A2F',
          'accent': '#5e5ce6',         // Indigo Neon
          'accent-hover': '#7c7ae8',
          'text-primary': '#ffffff',
          'text-secondary': '#8e8e93',
          'text-muted': '#8e8e93',
          'success': '#10B981',
          'warning': '#F59E0B',
          'error': '#EF4444',
          'border': '#1f1f1f',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', 'sans-serif'],
        'display': ['Poppins', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
        'card-hover': '0 10px 15px -3px rgba(99, 102, 241, 0.3)',
        'glow': '0 0 20px rgba(94, 92, 230, 0.4)',           // MODIFIÉ : Utilise la vraie couleur accent
        'glow-strong': '0 0 30px rgba(94, 92, 230, 0.5)',   // AJOUTÉ : Glow plus fort
        'glow-subtle': '0 0 15px rgba(94, 92, 230, 0.3)',   // AJOUTÉ : Glow subtil
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-card': 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(26, 26, 29, 0.95) 100%)',
        'gradient-glow': 'radial-gradient(circle at center, rgba(94, 92, 230, 0.3) 0%, transparent 70%)', // AJOUTÉ
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite', // AJOUTÉ : Pour les glows animés
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        glowPulse: {
          '0%, 100%': { opacity: '0.25' },
          '50%': { opacity: '0.4' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}