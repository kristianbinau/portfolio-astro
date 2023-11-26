<template>
	<div class="h-full font-mono" @click="focusInput">
		<div ref="linesRef" v-for="line of lines" class="flex items-center text-sm" v-html="line"></div>
		<div class="flex items-center text-sm">
			<div v-if="!commandExecuting" id="prompt" v-html="home"></div>
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
import { ref, nextTick } from 'vue';

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

/**
 * Defaults
 */
const home = ref<string>('[you@binau.me ~]$&nbsp;');

/**
 * Lifecycle
 */
async function onEnter() {
	commandExecuting.value = true;

	const command = input.value.trim();

	input.value = '';

	printLine(`${home.value}${command}`, false);

	await executeCommand(command);

	nextTick().then(() => {
		scrollToInput();
	});

	commandExecuting.value = false;
}

/**
 * Commands
 */
const commands: Command[] = [];

const executeCommand = async (command: string) => {
	const commandObject = commands.find((c) => c.name === command);

	if (commandObject === undefined) {
		await printLine(`${command}: command not found`);
		await printLine('type "help" to see avaliable commands');
		return;
	}

	for (const line of commandObject.execute()) {
		await printLine(line);
	}
};

commands.push(
	new Command('help', 'Show this help', () => {
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
	new Command('about', 'Show information about me', () => {
		const age = Math.floor((Date.now() - new Date('2001-06-28').getTime()) / 31557600000);

		return [
			`Hi, I am Kristian Binau, a ${age} year old developer from Denmark.`,
			'I am currently working on at Ordbogen A/S as a fullstack developer.',
			'You can find more information about me on&nbsp;<a class="underline" href="https://www.linkedin.com/in/kristian-binau-2a92a8171/">linkedin</a>.',
		];
	}),
);
commands.push(
	new Command('clear', 'Clear the terminal', () => {
		lines.value = [];
		return [];
	}),
);

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
	execute: () => string[];

	constructor(name: string, description: string, execute: () => string[]) {
		this.name = name;
		this.description = description;
		this.execute = execute;
	}
}
</script>
