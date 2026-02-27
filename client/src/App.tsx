import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { getRoutes } from './service'
import RouteWrapper from './components/RouteWrapper'

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				{getRoutes().map((route, index) => (
					<Route
						key={index}
						path={route.path}
						element={
							<RouteWrapper route={route} />
						}
					/>
				))}
			</Routes>
		</BrowserRouter>
	)
}
