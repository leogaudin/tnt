import {
	Stack,
	Flex,
	Heading,
	CircularProgress,
} from '@chakra-ui/react';
import { palette } from '../theme';
import { useTranslation } from 'react-i18next';

export default function ContentDelivered({ content }) {
	const { t } = useTranslation();

	if (!content || !Object.keys(content).length)
		return null;

	return (
		<Flex
			wrap='wrap'
			width='100%'
			justify='center'
			padding='1.5rem'
			gap='1.5rem'
		>
			{Object.keys(content).map((item) => {
				const validated = content[item].validated;
				const total = content[item].total;

				return (
					<Stack
						align='center'
						key={item}
					>
						<Heading
							size='md'
						>
							{t(item)}
						</Heading>
						<CircularProgress
							value={100 * validated / total}
							color={palette.text}
							size='42px'
						/>
						<Heading
							size='sm'
							fontWeight='light'
						>
							<code>{validated}/{total}</code>
						</Heading>
					</Stack>
				);
			})}
		</Flex>
	);
}
