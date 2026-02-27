import { useEffect, useState } from 'react';
import PagedTable from '../../components/PagedTable';
import { useTranslation } from 'react-i18next';
import { useDisclosure } from '@chakra-ui/react';
import BoxModal from '../../components/BoxModal';
import { timeAgo } from '../../service/utils';
import { callAPI } from '../../service';

export default function Scans() {
	const { t } = useTranslation();
	const [box, setBox] = useState(null);
	const { isOpen, onClose, onOpen } = useDisclosure();
	const [count, setCount] = useState(0);

	const handleClick = async (element) => {
		const box = await fetchBox(element.boxId);
		if (!box) return;
		setBox(box);
		onOpen();
	}

	const fetchCount = async () => {
		const response = await callAPI('POST', 'scan/count');
		const json = await response.json();
		return json.count || 0;
	};

	useEffect(() => {
		fetchCount()
			.then(count => {
				setCount(Math.min(count, 42000));
			});
	}, []);

	const fetchScans = async (skip, limit) => {
		const response = await callAPI(
			'POST',
			`scan/query?skip=${skip}&limit=${limit}`
		);
		const json = await response.json();

		return json.scans || [];
	};

	const fetchBox = async (id) => {
		const response = await callAPI('GET', `boxes/one/${id}`);
		const json = await response.json();

		return json.box || null;
	};

	return (
		<>
			{box &&
				<BoxModal
					box={box}
					onClose={onClose}
					isOpen={isOpen}
				/>
			}
			<PagedTable
				count={count}
				fetchElements={fetchScans}
				headers={[
					t('box'),
					t('time'),
					// t('comment'),
					t('received'),
					t('reachedGps')
				]}
				fields={[
					'boxId',
					'time',
					// 'comment',
					'markedAsReceived',
					'finalDestination',
				]}
				transforms={{
					time: (time) => timeAgo(time),
					boxId: (boxId) => <code>{`${boxId.slice(0, 5)}...`}</code>
				}}
				onRowClick={handleClick}
			/>
		</>
	)
}
