import { useState } from 'react'
import BoxFiltering from '../../../components/BoxFiltering'
import { Button, Heading, Stack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { deleteBoxes } from '../../../service';

export default function Delete() {
	const [filters, setFilters] = useState({});
	const [count, setCount] = useState(0);
	const { t } = useTranslation();

	const handleDelete = () => {
		if (!count) return;
		if (Object.keys(filters).length === 0) {
			if (!window.confirm(t('deletePrompt'))) return;
			if (!window.confirm(`⚠️ No filters set — this will delete ALL ${count} boxes. Are you absolutely sure?`)) return;
		} else {
			if (!window.confirm(`${t('deletePrompt')} (${count} boxes)`)) return;
		}
		deleteBoxes(filters)
				.then((res) => {
					alert(`${res.deletedCount} boxes deleted`);
					window.location.reload();
				})
				.catch(console.error);
	}


	return (
		<Stack
			align='stretch'
		>
			<Heading>{t('delete')}</Heading>
			<BoxFiltering
				filters={filters}
				setFilters={setFilters}
				count={count}
				setCount={setCount}
				// enableSearch={false}
			/>
			<Button
				colorScheme='red'
				variant='solid'
				onClick={handleDelete}
			>
				{t('delete')}
			</Button>
		</Stack>
	)
}
