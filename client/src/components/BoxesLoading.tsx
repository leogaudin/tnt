import { Flex, Heading, Spinner } from '@chakra-ui/react';
import { palette } from '../theme';
import { useTranslation } from 'react-i18next';

export default function BigLoading({ message }: { message?: string }) {
	const { t } = useTranslation();

	return (
		<Flex
			direction={{ base: 'column', md: 'row' }}
			justify='center'
			align='center'
			textAlign='center'
			color={palette.primary.dark}
			marginTop='33vh'
		>
			<Heading
				fontWeight='normal'
			>
				{message || t('loading')}
			</Heading>
			<Spinner
				marginX={10}
				marginY={5}
				size='xl'
			/>
		</Flex>
	)
}
