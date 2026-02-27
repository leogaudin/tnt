import {
	extendTheme,
	baseTheme,
} from '@chakra-ui/react'
import { colors } from '../service/specific'

export const palette = {
	text: 'black',
	background: 'white',
	primary: colors,
	success: {
		light: baseTheme.colors.green[100],
		main: baseTheme.colors.green[400],
		dark: baseTheme.colors.green[900],
	},
	warning: {
		light: baseTheme.colors.orange[100],
		main: baseTheme.colors.orange[400],
		dark: baseTheme.colors.orange[900],
	},
	error: {
		light: baseTheme.colors.red[100],
		main: baseTheme.colors.red[400],
		dark: baseTheme.colors.red[900],
	},
	info: {
		light: baseTheme.colors.blue[100],
		main: baseTheme.colors.blue[400],
		dark: baseTheme.colors.blue[900],
	},
	gray: {
		lightest: '#FAFAFA',
		light: '#F8F8F8',
		main: '#929292',
		dark: '#424242',
		darkest: '#212121',
	},
	cyan: {
		light: baseTheme.colors.cyan[100],
		main: baseTheme.colors.cyan[500],
		dark: baseTheme.colors.cyan[900],
	},
	blue: {
		light: baseTheme.colors.blue[100],
		main: baseTheme.colors.blue[400],
		dark: baseTheme.colors.blue[900],
	},
	teal: {
		light: baseTheme.colors.teal[100],
		main: baseTheme.colors.teal[400],
		dark: baseTheme.colors.teal[900],
	},
}

export const theme = extendTheme({
	initialColorMode: 'light',
	styles: {
		global: {
			'html, body': {
				margin: 0,
				padding: 0,
				boxSizing: 'border-box',
				color: palette.text,
				backgroundColor: palette.background,
				zIndex: 0,
			},
			'::selection': {
				backgroundColor: palette.primary.dark,
				color: palette.background,
			},
			'h1, h2, h3, h4, h5, h6': {
				marginBottom: 2,
			},
		},
	},
	colors: palette,
	fonts: {
		body: 'DM Sans, sans-serif',
		heading: 'DM Sans, sans-serif',
		mono: 'Menlo, monospace',
	},
	fontWeights: {
		heading: 800,
	},
	fontSizes: {
		heading: '3rem',
		heading2: '2.5rem',
		heading3: '2rem',
	},
	components: {
		Heading: {
			baseStyle: {
				fontWeight: 900,
			},
		},
	},
})
