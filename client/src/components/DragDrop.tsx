import { Flex } from '@chakra-ui/react';
import { palette } from '../theme';
import { useRef, useState, type ReactNode, type DragEvent, type ChangeEvent, type MouseEvent } from 'react';

interface DragDropProps {
	onFile: (file: File) => void;
	height?: number;
	accept?: string[];
	children?: ReactNode;
}

export default function DragDrop({
	onFile,
	height = 400,
	accept = ['.csv'],
	children,
}: DragDropProps) {
	const [hover, setHover] = useState(false);
	const inputFile = useRef<HTMLInputElement>(null);

	const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setHover(true);
		e.stopPropagation();
	};

	const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setHover(false);
		e.stopPropagation();
	};

	const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setHover(true);
		e.stopPropagation();
	};

	const handleDrop = (e: DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		onChangeFile(e);
		e.stopPropagation();
	};

	const handleClick = (e: MouseEvent<HTMLDivElement>) => {
		inputFile.current?.click();
		e.stopPropagation();
	}

	const onChangeFile = (e: DragEvent<HTMLDivElement> | ChangeEvent<HTMLInputElement>) => {
		let files: FileList | null = null;
		e.preventDefault();
		setHover(false);

		if ('dataTransfer' in e && e.dataTransfer?.files)
			files = e.dataTransfer.files;
		else if ('target' in e && (e.target as HTMLInputElement).files)
			files = (e.target as HTMLInputElement).files;

		if (files?.[0] && accept.indexOf(`.${files[0].name.split('.').pop()}`) === -1) {
			if ('target' in e) (e.target as HTMLInputElement).value = '';
			return alert('Invalid file type');
		}

		if (files?.[0]) onFile(files[0]);
	}

	return (
		<Flex
			width='100%'
			height={height}
			borderRadius={15}
			border={`1.5px solid ${palette.primary.dark}`}
			bg={hover ? palette.primary.light : 'transparent'}
			align='center'
			justify='center'
			direction='column'
			color={palette.primary.dark}
			cursor='pointer'
			_hover={{
				opacity: 0.8,
			}}
			textAlign='center'
			padding={5}
			onDrop={handleDrop}
			onDragOver={handleDragOver}
			onDragEnter={handleDragEnter}
			onDragLeave={handleDragLeave}
			onClick={handleClick}
		>
			<input
				type='file'
				id='file'
				ref={inputFile}
				onChange={onChangeFile}
				accept={accept.join(',')}
				style={{ display: 'none' }}
			/>
			{children}
		</Flex>
	)
}