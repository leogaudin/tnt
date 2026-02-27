import {
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalBody,
	ModalCloseButton,
	Text,
	Stack,
	Flex,
	Divider,
	Button,
	useDisclosure,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import ScansMap from '../pages/Boxes/components/ScansMap';
import PagedTable from './PagedTable';
import { timeAgo } from '../service/utils';
import { excludedKeys } from '../service/specific';
import SchoolModal from './SchoolModal';
import { callAPI, icons, fetchBoxScans, deleteBoxes } from '../service';
import type { Box, Scan } from '../types';
import { useEffect, useState } from 'react';
import Loading from './Loading';
import BoxContent from './BoxContent';

interface School {
	name: string;
	boxes: Box[];
}

export default function BoxModal({
	isOpen,
	onClose,
	box,
}: {
	isOpen: boolean;
	onClose: () => void;
	box: Box;
}) {
	const { t } = useTranslation();
	const [scans, setScans] = useState<Scan[] | null>(null);
	const [school, setSchool] = useState<School | null>(null);
	const { isOpen: isSchoolOpen, onOpen: onSchoolOpen, onClose: onSchoolClose } = useDisclosure();

	const fetchSchool = async () => {
		const response = await callAPI(
			'POST',
			`boxes/query`,
			{ filters: { school: box.school } }
		);
		const json = await response.json();

		const school: School = {
			name: box.school,
			boxes: json.boxes,
		};

		setSchool(school);
	}

	useEffect(() => {
		if (isOpen) {
			fetchSchool();
			fetchBoxScans(box.id)
				.then(setScans);
		}
	}, [isOpen]);

	const fetchScans = async () => {
		return [...(scans || [])].sort((a, b) => b.time - a.time);
	};

	const handleDelete = async () => {
		if (window.confirm(t('deletePrompt'))) {
			await deleteBoxes({ id: box.id });
			onClose();
			window.location.reload();
		}
	}

	return (
		<Modal isOpen={isOpen} onClose={onClose} size='5xl'>
			<ModalOverlay />
			<ModalContent>
				<ModalHeader
					fontWeight='bold'
				>
					<code>{box.id}</code>
				</ModalHeader>
				<ModalCloseButton />
				<ModalBody>
					<Stack>
						<Stack
							shadow='md'
							gap='1.5rem'
							padding='1.5rem'
							borderRadius={15}
						>
							<Stack
								direction={{ base: 'column', md: 'row' }}
								justify={{ base: 'center', md: 'space-between' }}
								align={{ base: 'center', md: 'start' }}
								width='100%'
							>
								<Stack
									gap={2}
								>
									{Object.entries(box).map(([key, value]) => {
										if ((excludedKeys as readonly string[]).includes(key) || !value)
											return null;
										return (
											<Text key={key}>
												<code>{t(key)}</code>: <strong>{String(value)}</strong>
											</Text>
										);
									})}
								</Stack>
								<QRCodeSVG
									value={'tnt://' + box.id}
									size={256}
									level='H'
								/>
							</Stack>
							{box.content && (
								<>
									<Divider marginY='1rem' />
									<BoxContent content={box.content} />
								</>
							)}
							{school
								? (
									<>
										<SchoolModal
											isOpen={isSchoolOpen}
											onClose={onSchoolClose}
											school={school}
										/>
										<Button
											variant='outline'
											colorScheme='gray'
											rightIcon={<icons.right />}
											onClick={onSchoolOpen}
										>
											{t('openRecipient')}
										</Button>
									</>
								)
								: <Loading />
							}
						</Stack>
						{scans?.length
							?
							<>
								<Divider marginY={5} />
								<Flex
									direction='column'
									justify={{ base: 'center', md: 'space-between' }}
									gap={5}
									padding={5}
									borderRadius={10}
									shadow='md'
								>
									<ScansMap box={{ ...box, scans }} />
									<PagedTable
										count={scans.length}
										fetchElements={fetchScans}
										headers={[
											t('time'),
											t('comment'),
											t('received'),
											t('reachedGps')
										]}
										fields={[
											'time',
											'comment',
											'markedAsReceived',
											'finalDestination',
										]}
										transforms={{
											time: (time: number) => timeAgo(time),
										}}
										onRowClick={() => {}}
										allowToChoosePageSize={false}
									/>
								</Flex>
							</>
							: !scans && <Loading />
						}
						<Button
							colorScheme='red'
							onClick={handleDelete}
							variant='ghost'
						>
							{t('delete')}
						</Button>
					</Stack>
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}