import { useContext } from 'react';
import { ScrollView, View } from 'react-native';
import InfoModal from './InfoModal';
import { Button, Text } from 'react-native-paper';
import { sendOfflineData } from '../service/storage'
import AppContext from '../context';

export default function OfflineScansModal({ visible, onClose }) {
	const { offlineData, setOfflineData } = useContext(AppContext);

	return (
		<InfoModal
			title='Offline scans'
			visible={visible}
			onClose={onClose}
			children={
				<View style={{ maxHeight: '50%' }}>
					{offlineData.length
						? (
							<View>
								<ScrollView style={{ flexGrow: 0 }}>
									{offlineData.map((data, index) => {
										return (
											<View
												key={data.boxId + index}
												style={{
													justifyContent: 'center',
													padding: 10,
													marginVertical: 5,
													backgroundColor: '#EFEFEF',
													borderRadius: 10,
												}}>
												<Text
													style={{ fontWeight: 'bold', fontSize: 17, marginBottom: 7 }}>
													Box n°{data.boxId}
												</Text>
												<Text>{new Date(data.time).toLocaleString()}</Text>
											</View>
										);
									})}
								</ScrollView>
								<Button
									mode='contained'
									onPress={() => {
										sendOfflineData(offlineData, setOfflineData);
										onClose();
									}}
									style={{ marginTop: 20 }}
								>
									Send offline scans
								</Button>
							</View>
						)
						: <Text style={{ textAlign: 'center' }}>No offline scans</Text>
					}
				</View>
			}
		/>
	);
}
