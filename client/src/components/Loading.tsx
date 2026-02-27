import { Flex, Spinner, Text } from '@chakra-ui/react';
import { palette } from '../theme';

export default function Loading({
	message = '',
}) {
	return (
		<Flex
			width='100%'
			height='100%'
			justify='center'
			align='center'
			marginY='1rem'
			gap='1rem'
			color={palette.primary.dark}
		>
			<Spinner />
			{message
				? <Text>
					{message}
				</Text>
				: null
			}
		</Flex>
	)
}
