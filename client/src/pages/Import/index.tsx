import { Stack } from '@chakra-ui/react';
import UpdateGPS from './components/UpdateGPS';
import UploadBoxes from './components/UploadBoxes';

export default function Import() {
	return (
		<Stack
			gap={5}
		>
			<UploadBoxes />
			<UpdateGPS />
		</Stack>
	)
}
