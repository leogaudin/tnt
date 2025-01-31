import {
    Button,
    Flex,
    Heading,
    Input,
    Text,
    useToast,
    NumberInput,
    NumberInputField,
    NumberIncrementStepper,
    NumberDecrementStepper,
    NumberInputStepper,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useSearchParams } from 'react-router-dom';
import { palette } from '../../theme';
import { callAPI } from '../../service';
import EnterPhone from './components/EnterPhone';

export default function Inventory() {
    const [searchParams, setSearchParams] = useSearchParams();
    const [phone, setPhone] = useState(searchParams.get('phone'));
    const [boxes, setBoxes] = useState({});
    const [items, setItems] = useState([]);
    const { t } = useTranslation();

    const enrolment = ['Grade 1', 'Grade 2', 'Grade 3'];

    const fetchBoxes = () => {
        callAPI('GET', `inventory/boxes/${phone}`)
            .then(res => res.json())
            .then((res) => {
                const accumulator = res.reduce((acc, box) => {
                    if (!acc[box.project])
                        acc[box.project] = {};

                    for (const key in box.content) {
                        setItems((prev) => {
                            if (!prev.includes(key))
                                return [...prev, key];
                            return prev;
                        });

                        if (!acc[box.project][key])
                            acc[box.project][key] = 0;
                        acc[box.project][key] += box.content[key];
                    }

                    return acc;
                }, {});
                setBoxes(accumulator);
            })
            .catch(e => {
                console.error(e);
            });
    }

    useEffect(() => {
        if (searchParams.get('phone'))
            setPhone(searchParams.get('phone'));
    }, [searchParams]);

    useEffect(() => {
        if (phone) {
            callAPI('GET', `inventory/phone/${phone}`)
                .then(res => res.json())
                .then((res) => {
                    if (!res.exists)
                        throw new Error('Phone number not found');
                    fetchBoxes();
                })
                .catch(e => {
                    setSearchParams({ phone: '' });
                });

            console.log('ok')
        }

    }, [phone]);

    if (!searchParams.get('phone'))
        return (
            <EnterPhone setSearchParams={setSearchParams} />
        );

    return (
        <Flex
            direction='column'
            align='center'
        >
            <Heading
                size='2xl'
                marginBottom='20px'
                textAlign='center'
            >
                {t('inventory')}
            </Heading>
            <Flex
                direction='column'
                width={{ base: '90%', md: '50%' }}
            >
                {Object.keys(boxes).map((project, i) => {
                    if (!Object.keys(boxes[project]).length)
                        return null;

                    return (
                        <Flex
                            key={i}
                            width='100%'
                            direction='column'
                            align='center'
                            justify='center'
                            padding='20px'
                            border='1px solid'
                            borderColor={palette.primary}
                            borderRadius='10px'
                            marginBottom='20px'
                        >
                            <Heading
                                size='lg'
                                textAlign='center'
                            >
                                Registered quantities for project "{project}"
                            </Heading>
                            <Flex
                                direction='column'
                                align='center'
                                justify='center'
                                marginTop='20px'
                            >
                                {Object.keys(boxes[project]).map((key, j) => (
                                    <Flex
                                        key={j}
                                        align='center'
                                        justify='center'
                                        marginBottom='10px'
                                    >
                                        <Text>
                                            <b>{key}</b>: {boxes[project][key]}
                                        </Text>
                                    </Flex>
                                ))}
                            </Flex>
                        </Flex>
                    )
                })}
            </Flex>
            <Text
                marginBottom='20px'
                textAlign='center'
                opacity={.5}
            >
                Please fill in the form below
            </Text>
            <Flex
                direction='column'
                align='center'
                justify='center'
                width={{ base: '90%', md: '50%' }}
                gap={2.5}
                marginY={2.5}
            >
                <Heading
                    size='md'
                    textAlign='center'
                >
                    Enrolment
                </Heading>
                {enrolment.map((item, i) => {
                    return (
                        <Flex
                            key={i}
                            direction='column'
                            align='center'
                            justify='center'
                            marginBottom='10px'
                            gap={1}
                        >
                            <Text>
                                <b>{item}</b>
                            </Text>
                            <NumberInput
                                defaultValue={0}
                                min={0}
                                max={100}
                                width='100%'
                            >
                                <NumberInputField />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </Flex>
                    )
                })}
            </Flex>
            <Flex
                direction='column'
                align='center'
                justify='center'
                width={{ base: '90%', md: '50%' }}
                gap={2.5}
                marginY={2.5}
            >
                <Heading
                    size='md'
                    textAlign='center'
                >
                    Inventory
                </Heading>
                {items.map((item, i) => {
                    return (
                        <Flex
                            key={i}
                            direction='column'
                            align='center'
                            justify='center'
                            marginBottom='10px'
                            gap={1}
                        >
                            <Text>
                                <b>{item}</b>
                            </Text>
                            <NumberInput
                                defaultValue={0}
                                min={0}
                                max={100}
                                width='fit-content'
                            >
                                <NumberInputField />
                                <NumberInputStepper>
                                    <NumberIncrementStepper />
                                    <NumberDecrementStepper />
                                </NumberInputStepper>
                            </NumberInput>
                        </Flex>
                    )
                })}
            </Flex>
            <Button
                color={palette.background}
                bg={palette.primary.main}
                _hover={{ bg: palette.primary.dark }}
                // width={{ base: '90%', md: '50%' }}
                marginBottom='20px'
            >
                {t('submit')}
            </Button>
        </Flex>
    );
}
