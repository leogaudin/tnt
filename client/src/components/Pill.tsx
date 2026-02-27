import {
	HStack,
	useToken,
	type StackProps,
} from '@chakra-ui/react';
import type { ReactNode } from 'react';

interface PillProps extends StackProps {
	color: string;
	text?: string;
	icon?: ReactNode;
	variant?: string;
}

export default function Pill({
	color,
	text,
	icon,
	variant,
	...props
}: PillProps) {
	const [red, orange, green] = useToken('colors', ['red.500', 'orange.500', 'green.500']);

	let resolvedColor = color;
	if (resolvedColor === 'error') resolvedColor = red;
	if (resolvedColor === 'warning') resolvedColor = orange;
	if (resolvedColor === 'success') resolvedColor = green;

	const additionalStyles = {
		backgroundColor: variant === 'solid' ? resolvedColor + '25' : 'transparent',
		border: variant === 'outline' ? `1.5px solid ${resolvedColor}` : 'none',
		justifyContent: icon ? 'left' : 'center',
		padding: text ? '0.25rem 0.75rem' : '0.5rem',
	};

	return (
		<HStack
			style={{
				color: resolvedColor,
				borderRadius: 20,
				fontWeight: 600,
				margin: '0.25rem',
				cursor: 'inherit',
				...additionalStyles,
				...props.style,
			}}
			_hover={{
				opacity: props.onClick ? 0.7 : 1,
				cursor: props.onClick ? 'pointer' : 'default',
			}}
			onClick={props.onClick}
			{...props}
		>
			{icon &&
				icon
			}
			{text?.length &&
				<span>{text}</span>
			}
		</HStack>
	);
}