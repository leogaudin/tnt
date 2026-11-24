import { Flex, Link, Spinner, Text } from '@chakra-ui/react';
import { Suspense, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { navbarWidth, user } from '../service';
import Navbar from './Navbar';
import { Helmet } from 'react-helmet-async';
import { name } from '../service/specific';

export default function RouteWrapper({ route }) {
	const navigate = useNavigate();

	useEffect(() => {
		if (!route.public && !user) {
			navigate('/auth');
		}
	}, []);

	return (
		<>
			<Helmet>
				<title>
					{route.title ? `${route.title} - ${name}` : name}
				</title>
			</Helmet>
			<Flex
				direction={{ base: 'column', md: 'row' }}
			>
				{user && <Navbar />}
				<Flex
					marginLeft={{ base: 0, md: user ? navbarWidth : 0 }}
					width='100%'
					height='100%'
					justify='center'
					direction='column'
					overflow='hidden'
					padding={5}
				>
					<Suspense fallback={<Flex justify='center' padding={10}><Spinner /></Flex>}>
						<route.component />
					</Suspense>
					{/* Attribution notice required by the additional terms in LICENSE
					    (AGPL-3.0 section 7(b)). Do not remove or hide. */}
					<Text
						as='footer'
						fontSize='xs'
						color='gray.500'
						textAlign='center'
						paddingTop={5}
					>
						<Link
							href='https://github.com/leogaudin/tnt'
							isExternal
						>
							Powered by TnT (Track-and-Trace)
						</Link>
					</Text>
				</Flex>
			</Flex>
		</>
	)
}
