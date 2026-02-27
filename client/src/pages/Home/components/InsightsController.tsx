import {
	Button,
	HStack,
	Input,
	Stack,
	Text,
	useToast,
} from '@chakra-ui/react'
import { callAPI, user } from '../../../service/';
import { palette } from '../../../theme';
import { useTranslation } from 'react-i18next';

export default function InsightsController() {
	const { t } = useTranslation();
	const toast = useToast();

	const link = `${window.location.href}insights/${user!.id}`;

	const handleCopy = () => {
		toast({
			title: t('copied'),
			status: 'success',
			duration: 1000,
			isClosable: true,
			position: 'top',
		})
		navigator.clipboard.writeText(link);
	};

	return (
		<Stack
			borderRadius={15}
			bg={user!.publicInsights ? palette.success.light : palette.error.light}
			padding={5}
			marginY={5}
			align='start'
			color={user!.publicInsights ? palette.success.dark : palette.error.dark}
		>
			<Text>{t('yourInsightsAreCurrently')} {user!.publicInsights ? t('public') : t('private')}.</Text>
			<Button
				size='sm'
				variant='outline'
				colorScheme={user!.publicInsights ? 'green' : 'red'}
				onClick={() => {
					callAPI('POST', 'insights/toggle')
						.then((res) => res.json())
						.then((res) => {
							user!.publicInsights = res.publicInsights;
							localStorage.setItem('user', JSON.stringify(user));
							window.location.reload();
						})
						.catch(() => {
							toast({
								title: 'Error updating visibility',
								status: 'error',
								duration: 1000,
								isClosable: true,
								position: 'top',
							})
						});
				}}
			>
				{t('make')} {user!.publicInsights ? t('private') : t('public')}
			</Button>
			{user!.publicInsights
				? <>
					<Text
						textTransform='uppercase'
						fontWeight='bold'
						fontSize='small'
						marginTop={5}
					>
						{t('accessLink')}
					</Text>
					<HStack
						width='100%'
						gap={2}
						fontSize='small'
						overflowWrap='anywhere'
						borderRadius={15}
					>
						<Input
							value={link}
							isReadOnly
							fontFamily='monospace'
							fontSize='small'
							colorScheme={user!.publicInsights ? 'green' : 'red'}
							borderColor={user!.publicInsights ? palette.success.main : palette.error.main}
							focusBorderColor={palette.primary.dark}
							onClick={handleCopy}
						/>
					</HStack>
				</>
				: null}
		</Stack>
	)
}
