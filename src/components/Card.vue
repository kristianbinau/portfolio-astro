<template>
	<div
		v-if="!closed"
		:class="combinedClass"
		class="shadow-solid rounded-xl border-4 border-black transition-all duration-500 ease-in"
	>
		<div class="flex items-center gap-2 border-b-2 border-black p-2">
			<template v-if="controls">
				<div
					@click="closed = true"
					class="h-5 w-5 rounded-xl border-2 border-black bg-red-400 hover:bg-red-500"
				></div>
				<div
					@click="minimized = !minimized"
					class="h-5 w-5 rounded-xl border-2 border-black bg-yellow-300 hover:bg-yellow-500"
				></div>
				<div
					@click="maximized = !maximized"
					class="h-5 w-5 rounded-xl border-2 border-black bg-green-300 hover:bg-green-500"
				></div>
			</template>
			<div class="grow select-none text-center font-bold">{{ title }}</div>
		</div>
		<div v-show="!minimized" class="p-2">
			<div class="no-scrollbar h-40 overflow-y-auto font-bold">
				<slot> </slot>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { computed, defineProps, ref } from 'vue';

const props = defineProps({
	title: {
		type: String,
		required: true,
	},
	classes: {
		type: String,
		default: '',
		required: false,
	},
	controls: {
		type: Boolean,
		default: false,
		required: false,
	},
});

const combinedClass = computed(() => {
	console.log(props.classes);

	return `${props.classes} ${minimized.value ? 'h-[50px]' : 'h-full'}`;
});

const closed = ref(false);
const minimized = ref(false);
const maximized = ref(false);
</script>
