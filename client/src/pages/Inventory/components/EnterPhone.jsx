import {
    Flex,
    Heading,
    Input,
    Button,
    useToast,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { palette } from '../../../theme';
import { callAPI } from '../../../service';

export default function EnterPhone({
    setSearchParams,
}) {
    const [phone, setPhone] = useState('');
    const { t } = useTranslation();
    const toast = useToast();

    const handleSubmit = (e) => {
        e.preventDefault();
        callAPI('GET', `inventory/phone/${phone}`)
            .then(res => res.json())
            .then((res) => {
                if (!res.exists)
                    throw new Error('Phone number not found');
                setSearchParams({ phone });
            })
            .catch(e => {
                toast({
                    title: e.message,
                    status: 'error',
                    duration: 5000,
                    isClosable: true,
                    position: 'top',
                })
            });
    };

    return (
        <Flex
            direction='column'
            align='center'
            justify='center'
            marginTop='200px'
        >
            <Heading
                size='lg'
                marginBottom='20px'
                textAlign='center'
            >
                {t('pleaseEnterPhone')}
            </Heading>
            <Flex
                align='center'
                justify='center'
                direction='column'
                gap={2.5}
                as='form'
                onSubmit={handleSubmit}
            >
                <Input
                    focusBorderColor={palette.primary.dark}
                    placeholder={t('phone')}
                    onChange={(e) => setPhone(e.target.value)}
                    width='100%'
                />
                <Button
                    color={palette.background}
                    bg={palette.primary.main}
                    _hover={{ bg: palette.primary.dark }}
                    onClick={handleSubmit}
                    type='submit'
                    width='100%'
                >
                    {t('continue')}
                </Button>
            </Flex>
        </Flex>
    )
}
