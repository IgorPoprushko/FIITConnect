<template>
  <q-dialog v-model="isOpen" @hide="onClose">
    <q-card :style="cardWidth">
      <!-- Header -->
      <q-card-section class="row items-center q-pb-none">
        <div class="text-h6">{{ title }}</div>
        <q-space />
        <q-btn icon="close" flat round dense v-close-popup />
      </q-card-section>

      <q-card-section v-if="description" class="q-pt-none">
        <div class="text-caption text-grey-7">{{ description }}</div>
      </q-card-section>

      <q-card-section class="q-pt-sm">
        <slot name="content"></slot>
      </q-card-section>

      <q-card-actions align="right" class="q-px-md q-pb-md">
        <q-btn flat :label="cancelLabel" color="secondary" v-close-popup @click="onCancel" />
        <q-btn unelevated :color="confirmColor" :label="confirmLabel" :loading="loading" :disable="disableConfirm"
          @click="onConfirm" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmColor?: string;
  loading?: boolean;
  disableConfirm?: boolean;
  width?: string;
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  confirmColor: 'primary',
  loading: false,
  disableConfirm: false,
  width: '450px',
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  confirm: [];
  cancel: [];
  close: [];
}>();

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
});

const cardWidth = computed(() => ({
  minWidth: '320px',
  maxWidth: '90vw',
  width: props.width,
}));

const onConfirm = () => {
  emit('confirm');
};

const onCancel = () => {
  emit('cancel');
};

const onClose = () => {
  emit('close');
};
</script>
