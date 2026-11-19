import { useState, useEffect, useContext } from 'react';
import {
	Keyboard,
	KeyboardAvoidingView,
	Platform,
	TouchableWithoutFeedback,
	View,
} from 'react-native';
import CheckBox from '@react-native-community/checkbox';
import styles from '../theme/styles';
import { showToast } from '../service/toast';
import { Modal, Text, TextInput, Portal, Button } from 'react-native-paper';
import { submitScan } from '../service/storage';
import { getLocation, locationErrorMessage } from '../service/location';
import AppContext from '../context';

export default function SendScanModal({ modalVisible, setModalVisible, data }) {
	const [userLocation, setUserLocation] = useState();
	const [locationError, setLocationError] = useState(null);
	const [comment, setComment] = useState('');
	const [toggled, setToggled] = useState(false);
	const { login, setOfflineData } = useContext(AppContext);

	const handleSubmit = () => {
		const scan = {
			boxId: data,
			operatorId: login,
			time: Date.now(),
			location: userLocation,
			markedAsReceived: toggled,
			comment: comment,
		};
		setModalVisible(false);
		resetData();
		submitScan(scan, setOfflineData);
	};

	const locate = () => {
		setLocationError(null);
		getLocation()
			.then(setUserLocation)
			.catch((error) => {
				const message = locationErrorMessage(error);
				setLocationError(message);
				showToast('error', 'Location', message);
			});
	};

	useEffect(() => {
		if (modalVisible)
			locate();
	}, [modalVisible]);

	function resetData() {
		setUserLocation(null);
		setLocationError(null);
		setComment('');
		setToggled(false);
	}

	return (
		<Portal>
			<Modal
				style={[styles.view]}
				visible={modalVisible}
			>
				<KeyboardAvoidingView
					style={{ flex: 1 }}
					behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
					<TouchableWithoutFeedback
						onPress={Keyboard.dismiss}
						accessible={false}
					>
						<View style={styles.modalContainer}>
							<View style={styles.modal}>
								<Text style={[styles.title]}>
									Box n°{data}
								</Text>
								<View
									style={{
										flexDirection: 'column',
										alignItems: 'center',
										marginVertical: 15,
									}}
								>
									<Text style={{ fontWeight: 'bold' }}>Location</Text>
									<Text style={{ textAlign: 'center' }}>
										{userLocation
											? `(${userLocation.coords.latitude}, ${userLocation.coords.longitude})`
											: locationError ?? `Determining...`
										}
									</Text>
									{!userLocation && locationError && (
										<Button mode='text' onPress={locate}>
											Retry
										</Button>
									)}
								</View>
								<TextInput
									mode='outlined'
									value={comment}
									onChangeText={text => setComment(text)}
									style={{ width: '100%' }}
									placeholder='Add a comment...'
									maxLength={140}
								/>
								<View
									style={{
										flexDirection: 'row',
										alignItems: 'center',
										marginVertical: 15,
									}}>
									<CheckBox
										value={toggled}
										onValueChange={newValue => setToggled(newValue)}
										style={{ marginRight: 10 }}
										tintColors={{ true: '#007AFF', false: '#C7C7CC' }}
									/>
									<Text>Mark as received (HT only)</Text>
								</View>
								<View style={[styles.horizontal]}>
									<Button
										mode='outlined'
										style={{ margin: 5 }}
										onPress={() => {
											setModalVisible(false);
											resetData();
										}}>
										Cancel
									</Button>
									<Button
										disabled={!userLocation}
										mode='contained'
										style={{ margin: 5 }}
										onPress={handleSubmit}
									>
										Send
									</Button>
								</View>
							</View>
						</View>
					</TouchableWithoutFeedback>
				</KeyboardAvoidingView>
			</Modal>
		</Portal>
	);
}
