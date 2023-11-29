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
				@keydown.enter.prevent="onEnter"
				@keydown.tab.prevent="onTab"
			/>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, nextTick, computed, watch } from 'vue';
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
const hasFetchedGitHub = ref<boolean>(false);
const previousTabValue = ref<string>('');
const previousTabSuggestions = ref<string[]>([]);

const prompt = computed(() => {
	const path = currentPath.value === '/home/you' ? '~' : currentPath.value;
	return `<span class="text-gray-400">[</span><span class="text-fuchsia-500">you@binau.me</span>&nbsp;<span class="text-violet-900">${path}</span><span class="text-gray-400">]</span>$&nbsp;`;
});

/**
 * Lifecycle
 */
// Execute command
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

// Suggest & autocomplete command
async function onTab() {
	const inputValue = input.value;

	await handleSuggestions(inputValue);

	if (!inputValue.includes(' ')) {
		suggestCommands(inputValue);
	} else {
		suggestItems(inputValue);
	}
}

// Watch input and scroll to input
watch(input, () => {
	scrollToInput();
});

/**
 * Suggestions
 */
const handleSuggestions = async (inputValue: string) => {
	// If the user has pressed tab twice we show the suggestions
	if (previousTabValue.value === inputValue) {
		if (previousTabSuggestions.value.length === 0) {
			return;
		}

		const suggestions = previousTabSuggestions.value.join('&nbsp;&nbsp;');

		printLine(`${prompt.value}${inputValue}`, false);
		await printLine(suggestions);

		nextTick().then(() => {
			scrollToInput();
		});

		return;
	} else {
		previousTabValue.value = inputValue;
		previousTabSuggestions.value = [];
	}
};

const suggestCommands = (inputValue: string) => {
	const matchingCommands = commands.filter((command) => command.name.startsWith(inputValue));

	if (matchingCommands.length === 0) {
		return;
	}

	if (matchingCommands.length === 1) {
		const matchingCommand = matchingCommands[0];

		if (matchingCommand === undefined) {
			return;
		}

		input.value = matchingCommand.name;
		return;
	}

	previousTabSuggestions.value = matchingCommands.map((command) => command.name);
};

const suggestItems = (inputValue: string) => {
	// Get the current string that we are trying to autocomplete
	let currentSuggestableString = inputValue.split(' ').slice(-1)[0];

	if (currentSuggestableString === undefined) {
		return;
	}

	// Get the current directory that we are trying to autocomplete in
	const currentSuggestableStringDirectory = currentSuggestableString
		.split('/')
		.slice(0, -1)
		.join('/');

	// If the currentSuggestableStringDirectory is empty we are trying to autocomplete in the current directory
	let directory: Directory | undefined = currentDirectory.value;
	if (currentSuggestableStringDirectory !== '') {
		// We need to figure out if it's an absolute or relative path
		if (currentSuggestableString.startsWith('/')) {
			directory = getDirectoryByPath(currentSuggestableStringDirectory);
		} else {
			const directoryPath = currentPath.value === '/' ? '' : currentPath.value;
			directory = getDirectoryByPath(`${directoryPath}/${currentSuggestableStringDirectory}`);
		}
	}

	if (directory === undefined) {
		return;
	}

	// If currentSuggestableString contains a / we need to search only for what comes after the last /
	if (currentSuggestableString.includes('/')) {
		const currentSuggestableStringParts = currentSuggestableString.split('/');

		if (currentSuggestableStringParts.length === 0) {
			return;
		}

		const currentSuggestableStringLastParts = currentSuggestableStringParts.slice(-1)[0];

		if (currentSuggestableStringLastParts === undefined) {
			return;
		}

		currentSuggestableString = currentSuggestableStringLastParts;
	}

	const matchingItems = directory.items.filter((item) => {
		if (currentSuggestableString === undefined) {
			return false;
		}

		return item.name.startsWith(currentSuggestableString);
	});

	if (matchingItems.length === 0) {
		return;
	}

	if (matchingItems.length === 1) {
		const matchingItem = matchingItems[0];

		if (matchingItem === undefined) {
			return;
		}

		if (currentSuggestableString === '') {
			input.value = inputValue + matchingItem.name;
		} else {
			input.value = inputValue.replace(currentSuggestableString, matchingItem.name);
		}
		return;
	}

	previousTabSuggestions.value = matchingItems.map((item) => item.name);
};

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
			'At Ordbogen I work on&nbsp;<a class="underline" href="https://www.grammatip.com" target="_blank">grammatip.com</a>,',
			'a website that helps danish students learn grammar.',
			'You can find more information about me on&nbsp;<a class="underline" href="https://www.linkedin.com/in/kristian-binau-2a92a8171/" target="_blank">linkedin</a>.',
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

		if (isGitHubFile(file)) {
			printGitHubFile(file);
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
							name: 'made-with.txt',
							path: '/home/you/made-with.txt',
							contents: [
								'Made with:',
								'&nbsp;&nbsp;<a class="underline" target="_blank" href="https://astro.build">Astro</a>',
								'&nbsp;&nbsp;<a class="underline" target="_blank" href="https://v3.vuejs.org">Vue</a>',
								'&nbsp;&nbsp;<a class="underline" target="_blank" href="https://tailwindcss.com">Tailwind</a>',
								'&nbsp;&nbsp;<a class="underline" target="_blank" href="https://www.typescriptlang.org">TypeScript</a>',
							],
						},
						{
							name: 'deployed-on.txt',
							path: '/home/you/deployed-on.txt',
							contents: [
								'Deployed on:',
								'&nbsp;&nbsp;<a class="underline" target="_blank" href="https://vercel.com">Vercel</a>',
							],
						},
						{
							name: 'passwords.txt',
							path: '/home/you/passwords.txt',
							contents: ['root: 4h6sgb732x'],
						},
						{
							name: 'projects',
							path: '/home/you/projects',
							items: [],
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

	// Remove the last / if it exists
	if (path.endsWith('/')) {
		path = path.slice(0, -1);
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
 * GitHub
 */
const projectsDirectory = (() => {
	const home = filesystem.items.find((item) => item.name === 'home');

	if (home === undefined || !isDirectory(home)) {
		throw new Error('Home directory not found');
	}

	const you = home.items.find((item) => item.name === 'you');

	if (you === undefined || !isDirectory(you)) {
		throw new Error('You directory not found');
	}

	const projects = you.items.find((item) => item.name === 'projects');

	if (projects === undefined || !isDirectory(projects)) {
		throw new Error('Projects directory not found');
	}

	return projects;
})();

const gitHubRepos: GitHubRepo[] = [
	{
		name: 'portfolio-astro',
		url: 'https://api.github.com/repos/kristianbinau/portfolio-astro',
		insertInto: projectsDirectory,
	},
];

const fetchGitHubRepos = () => {
	return Promise.all(gitHubRepos.map((repo) => fetchGitHubRepo(repo)));
};

const fetchGitHubRepo = async (githubRepo: GitHubRepo) => {
	// Check if we have already fetched the repo
	const localStorageRepo = localStorage.getItem(`github-repo-${githubRepo.name}`);

	if (localStorageRepo !== null) {
		const repoDirectory = JSON.parse(localStorageRepo) as GitHubDirectory;

		githubRepo.insertInto.items.push(repoDirectory);
		return;
	}

	const response = await fetch(githubRepo.url);

	if (!response.ok) {
		return;
	}

	const repo = (await response.json()) as { name: string; contents_url: string };

	const repoDirectory = {
		name: repo.name,
		path: `${githubRepo.insertInto.path}/${repo.name}`,
		url: repo.contents_url.replace('{+path}', ''),
		items: [],
	};

	githubRepo.insertInto.items.push(repoDirectory);

	await fetchGitHubRepoContents(repoDirectory);

	// Save the repo directory to localStorage
	localStorage.setItem(`github-repo-${githubRepo.name}`, JSON.stringify(repoDirectory));
};

const fetchGitHubRepoContents = async (repoDirectory: GitHubDirectory) => {
	const response = await fetch(`${repoDirectory.url}`);

	if (!response.ok) {
		return;
	}

	const contents = (await response.json()) as ((GitHubFile | GitHubDirectory) & {
		type: 'dir' | 'file';
		content: string;
	})[];

	for (const content of contents) {
		if (content.type === 'dir') {
			const directory = {
				name: content.name,
				path: `${repoDirectory.path}/${content.name}`,
				url: content.url.split('?')[0] as string,
				items: [],
			};

			repoDirectory.items.push(directory);

			await fetchGitHubRepoContents(directory);
		} else {
			const file = {
				name: content.name,
				path: `${repoDirectory.path}/${content.name}`,
				url: content.url,
				contents: [],
			};

			repoDirectory.items.push(file);
		}
	}
};

const fetchGitHubFileContents = async (file: GitHubFile) => {
	// First we check if we have already fetched the file and saved it to contents
	if (file.contents.length !== 0) {
		return;
	}

	// Then we check if we have already fetched the file and saved it to localStorage
	const localStorageFile = localStorage.getItem(`github-file-${file.path}`);
	if (localStorageFile !== null) {
		const fileContents = JSON.parse(localStorageFile) as GitHubFile;

		file.contents = fileContents.contents;

		return;
	}

	// If we haven't fetched the file before we fetch it from GitHub
	const response = await fetch(file.url);

	if (!response.ok) {
		return;
	}

	const fileContents = (await response.json()) as { content: string };

	// Save to contents
	file.contents = atob(fileContents.content).split('\n');

	// Save to localStorage
	localStorage.setItem(`github-file-${file.path}`, JSON.stringify(file));
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

	if (!hasFetchedGitHub.value) {
		hasFetchedGitHub.value = true;

		fetchGitHubRepos();
	}
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

const printGitHubFile = async (file: GitHubFile) => {
	if (file.contents.length === 0) {
		await fetchGitHubFileContents(file);
	}

	for (const line of file.contents) {
		printLine(line);
	}

	nextTick().then(() => {
		scrollToInput();
	});
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

type GitHubFile = {
	url: string;
} & File;

type GitHubDirectory = {
	url: string;
} & Directory;

type GitHubRepo = {
	name: string;
	url: string;
	insertInto: Directory;
};

function isFile(item: File | Directory): item is File {
	return (item as File).contents !== undefined;
}

function isDirectory(item: File | Directory): item is Directory {
	return (item as Directory).items !== undefined;
}

function isGitHubFile(item: File): item is GitHubFile {
	return (item as GitHubFile).url !== undefined;
}
</script>
