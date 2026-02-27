import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './theme/index.css'
import { ChakraProvider } from '@chakra-ui/react'
import { theme } from './theme'
import './language'
import { AppProvider } from './context'
import { HelmetProvider } from 'react-helmet-async'

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
	<StrictMode>
		<HelmetProvider>
			<AppProvider>
				<ChakraProvider theme={theme}>
					<App />
				</ChakraProvider>
			</AppProvider>
		</HelmetProvider>
	</StrictMode>,
)