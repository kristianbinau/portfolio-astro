<template>
	<div class="h-full font-mono" @click="focusInput">
		<div ref="linesRef" v-for="line of lines" class="flex items-center text-sm" v-html="line"></div>
		<div class="flex items-center text-sm">
			<div v-if="!commandExecuting" id="prompt" v-html="prompt"></div>
			<input
				ref="inputRef"
				v-model="input"
				class="bg-transparent outline-none"
				type="text"
				@keyup.enter="onEnter"
			/>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, nextTick, computed } from 'vue';
import { getAge } from '@utils/me';

/**
 * Consts
 */
const HOME_PATH = '/home/you';

/**
 * Refs
 */
const inputRef = ref<HTMLInputElement>();
const linesRef = ref<HTMLElement[]>([]);

/**
 * Data
 */
const lines = ref<string[]>(['get started with typing "help"']);

/**
 * State
 */
const input = ref<string>('');
const commandExecuting = ref<boolean>(false);

const prompt = computed(() => {
	const path = currentPath.value === '/home/you' ? '~' : currentPath.value;
	return `<span class="text-gray-400">[</span><span class="text-fuchsia-500">you@binau.me</span>&nbsp;<span class="text-violet-900">${path}</span><span class="text-gray-400">]</span>$&nbsp;`;
});

/**
 * Lifecycle
 */
async function onEnter() {
	commandExecuting.value = true;

	const inputValue = input.value.trim();

	const command = inputValue.split(' ')[0] ?? inputValue;

	const args = inputValue.split(' ').slice(1);

	input.value = '';

	printLine(`${prompt.value}${inputValue}`, false);

	await executeCommand(command, args);

	nextTick().then(() => {
		scrollToInput();
	});

	commandExecuting.value = false;
}

/**
 * Commands
 */
const commands: Command[] = [];

const executeCommand = async (command: string, args: string[]) => {
	const commandObject = commands.find((c) => c.name === command);

	if (commandObject === undefined) {
		await printLine(`${command}: command not found`);
		await printLine('type "help" to see avaliable commands');
		return;
	}

	for (const line of commandObject.execute(args)) {
		await printLine(line);
	}
};

commands.push(
	new Command('help', 'Show this help', (args) => {
		if (args.length !== 0) {
			return ['help: invalid number of arguments, expected 0'];
		}

		if (commands.length === 0) {
			return ['No commands avaliable'];
		}

		let help = ['Avaliable commands:'];

		for (const command of commands) {
			help.push(`${command.name} - ${command.description}`);
		}

		return help;
	}),
);
commands.push(
	new Command('about', 'Show information about me', (args) => {
		if (args.length !== 0) {
			return ['about: invalid number of arguments, expected 0'];
		}

		const age = getAge();

		return [
			`Hi, I am Kristian Binau, a ${age} year old developer from Denmark.`,
			'I am currently working at Ordbogen A/S as a fullstack developer.',
			'At Ordbogen I work on <a class="underline" href="https://www.grammatip.com">grammatip.com</a>, a website that helps danish students learn grammar.',
			'You can find more information about me on&nbsp;<a class="underline" href="https://www.linkedin.com/in/kristian-binau-2a92a8171/">linkedin</a>.',
		];
	}),
);
commands.push(
	new Command('clear', 'Clear the terminal', (args) => {
		if (args.length !== 0) {
			return ['clear: invalid number of arguments, expected 0'];
		}

		lines.value = [];
		return [];
	}),
);
commands.push(
	new Command('ls', 'List files and directories', (args) => {
		if (args.length !== 0) {
			return ['ls: invalid number of arguments, expected 0'];
		}

		const directory = currentDirectory.value;

		if (directory.items.length === 0) {
			return ['No files or directories in this directory'];
		}

		const items = directory.items.map((item) => item.name).join('&nbsp;&nbsp;');

		return [items];
	}),
);
commands.push(
	new Command('cd', 'Change directory', (args) => {
		if (args.length > 1) {
			return ['cd: invalid number of arguments, expected 0..1'];
		}

		if (args.length === 0) {
			currentPath.value = HOME_PATH;
			return [];
		}

		let newPath = args[0];

		if (newPath === undefined) {
			return ['cd: error'];
		}

		if (!newPath.startsWith('/')) {
			newPath = `${currentPath.value === '/' ? '' : currentPath.value}/${newPath}`;
		}

		const directory = getDirectoryByPath(newPath);

		if (directory === undefined) {
			return ['cd: no such file or directory'];
		}

		currentPath.value = directory.path;

		return [];
	}),
);
commands.push(
	new Command('cat', 'Print file contents', (args) => {
		if (args.length !== 1) {
			return ['cat: invalid number of arguments, expected 1'];
		}

		let path = args[0];

		if (path === undefined) {
			return ['cat: error'];
		}

		if (!path.startsWith('/')) {
			path = `${currentPath.value === '/' ? '' : currentPath.value}/${path}`;
		}

		const file = getFileByPath(path);

		if (file === undefined) {
			return ['cat: no such file'];
		}

		return file.contents;
	}),
);

/**
 * Filesystem
 */
const currentPath = ref<string>('/home/you');
const filesystem: Directory = {
	name: '/',
	path: '/',
	items: [
		{
			name: 'home',
			path: '/home',
			items: [
				{
					name: 'you',
					path: '/home/you',
					items: [
						{
							name: 'passwords.txt',
							path: '/home/you/passwords.txt',
							contents: ['root: 4h6sgb732x'],
						},
					],
				},
			],
		},
		{
			name: 'var',
			path: '/var',
			contents: ['This is a file'],
		},
	],
};

const currentDirectory = computed(() => {
	const directory = getDirectoryByPath(currentPath.value);

	if (directory === undefined) {
		throw new Error('Inside invalid directory??');
	}

	return directory;
});

const getDirectoryByPath = (path: string): Directory | undefined => {
	if (path === '/') {
		return filesystem;
	}

	if (!path.startsWith('/')) {
		throw new Error('Path does not start with /');
	}

	const pathParts = path.split('/').splice(1);
	let selectedDirectory = filesystem;

	// Now we can move through the filesystem
	for (const pathPart of pathParts) {
		if (pathPart === '..') {
			if (selectedDirectory.name === '/') {
				return undefined;
			}

			const parentDirectoryPath = selectedDirectory.path.split('/').slice(0, -1).join('/');

			if (parentDirectoryPath === '') {
				return filesystem;
			}

			const parentDirectory = getDirectoryByPath(parentDirectoryPath);

			if (parentDirectory === undefined) {
				return undefined;
			}

			selectedDirectory = parentDirectory;
			continue;
		}

		const item = selectedDirectory.items.find((item) => item.name === pathPart);

		if (item === undefined) {
			return undefined;
		}

		if (isFile(item)) {
			return undefined;
		}

		selectedDirectory = item;
	}

	return selectedDirectory;
};

const getFileByPath = (path: string): File | undefined => {
	const directoryPath = path.split('/').slice(0, -1).join('/');
	const fileName = path.split('/').slice(-1)[0];

	let directory: Directory | undefined = filesystem;
	if (directoryPath !== '') {
		directory = getDirectoryByPath(directoryPath);
	}

	if (directory === undefined) {
		return undefined;
	}

	const file = directory.items.find((item) => item.name === fileName);

	if (file === undefined) {
		return undefined;
	}

	if (isDirectory(file)) {
		return undefined;
	}

	return file;
};

/**
 * Utils
 *
 * These functions are used to manipulate the terminal
 */

/**
 * Utils: Scroll
 */
const scrollToLastLine = () => {
	const linesElement = linesRef.value[linesRef.value.length - 1];

	if (linesElement === undefined) {
		return;
	}

	linesElement.scrollIntoView();
};

const scrollToInput = () => {
	inputRef.value?.scrollIntoView();
};

/**
 * Utils: Focus
 */
const focusInput = () => {
	inputRef.value?.focus();
};

/**
 * Utils: Print
 */
const printLine = async (line: string, delay: boolean = true) => {
	lines.value.push(line);
	scrollToLastLine();

	if (delay) {
		await nextTick();
		await new Promise((r) => setTimeout(r, Math.random() * 150));
	}
};
</script>

<script lang="ts">
class Command {
	name: string;
	description: string;
	execute: (args: string[]) => string[];

	constructor(name: string, description: string, execute: (args: string[]) => string[]) {
		this.name = name;
		this.description = description;
		this.execute = execute;
	}
}

type File = {
	name: string;
	path: string;
	contents: string[];
};

type Directory = {
	name: string;
	path: string;
	items: (File | Directory)[];
};

function isFile(item: File | Directory): item is File {
	return (item as File).contents !== undefined;
}

function isDirectory(item: File | Directory): item is Directory {
	return (item as Directory).items !== undefined;
}
</script>
