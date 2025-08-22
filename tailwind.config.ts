import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				casino: {
					gold: 'hsl(var(--casino-gold))',
					'gold-light': 'hsl(var(--casino-gold-light))',
					'gold-dark': 'hsl(var(--casino-gold-dark))',
					'gold-bright': 'hsl(var(--casino-gold-bright))',
					charcoal: 'hsl(var(--casino-charcoal))',
					'charcoal-light': 'hsl(var(--casino-charcoal-light))',
					emerald: 'hsl(var(--casino-emerald))',
					ruby: 'hsl(var(--casino-ruby))',
					platinum: 'hsl(var(--casino-platinum))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			backgroundImage: {
				'gradient-gold': 'var(--gradient-gold)',
				'gradient-gold-radial': 'var(--gradient-gold-radial)',
				'gradient-casino-primary': 'var(--gradient-casino-primary)',
				'gradient-subtle': 'var(--gradient-subtle)',
				'gradient-dark': 'var(--gradient-dark)',
				'gradient-ambient-day': 'var(--gradient-ambient-day)',
				'gradient-ambient-evening': 'var(--gradient-ambient-evening)',
				'gradient-ambient-night': 'var(--gradient-ambient-night)'
			},
			boxShadow: {
				'gold': 'var(--shadow-gold)',
				'elegant': 'var(--shadow-elegant)',
				'gold-glow': 'var(--shadow-gold-glow)',
				'card-luxury': 'var(--shadow-card-luxury)',
				'floating': 'var(--shadow-floating)',
				'inset-gold': 'var(--shadow-inset-gold)'
			},
			transitionTimingFunction: {
				'smooth': 'var(--transition-smooth)',
				'luxury': 'var(--transition-luxury)',
				'bounce-luxury': 'var(--transition-bounce)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'chip-clink': {
					'0%, 100%': { transform: 'translateY(0) rotate(0deg)' },
					'25%': { transform: 'translateY(-2px) rotate(1deg)' },
					'75%': { transform: 'translateY(-1px) rotate(-0.5deg)' }
				},
				'card-flip': {
					'0%': { transform: 'rotateY(0deg)' },
					'50%': { transform: 'rotateY(90deg)' },
					'100%': { transform: 'rotateY(0deg)' }
				},
				'slot-spin': {
					'0%': { transform: 'translateY(0)' },
					'25%': { transform: 'translateY(-10px)' },
					'50%': { transform: 'translateY(0)' },
					'75%': { transform: 'translateY(-5px)' },
					'100%': { transform: 'translateY(0)' }
				},
				'gold-shimmer': {
					'0%': { backgroundPosition: '-200% center' },
					'100%': { backgroundPosition: '200% center' }
				},
				'ambient-pulse': {
					'0%, 100%': { opacity: '0.1' },
					'50%': { opacity: '0.3' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'chip-clink': 'chip-clink 0.6s ease-in-out',
				'card-flip': 'card-flip 0.8s ease-in-out',
				'slot-spin': 'slot-spin 1s ease-in-out',
				'gold-shimmer': 'gold-shimmer 2s linear infinite',
				'ambient-pulse': 'ambient-pulse 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
