<script setup lang="ts">
import { marked } from 'marked';
import { isSameDay, parseISO, format } from 'date-fns';
const queryCache = useQueryCache();

defineProps<{ habit: Habit; isMyProfile: Boolean }>();

const renderMarkdown = (text: string) => marked(text);

// Available color options for habit completion
const qualityColors = [
  { name: 'Gold', value: 'gold', gradient: 'from-yellow-300 via-yellow-400 to-yellow-500', dark: 'dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-600' },
  { name: 'Red', value: 'red', gradient: 'from-red-400 via-red-500 to-red-600', dark: 'dark:from-red-500 dark:via-red-600 dark:to-red-700' },
  { name: 'Pink', value: 'pink', gradient: 'from-pink-300 via-pink-400 to-pink-500', dark: 'dark:from-pink-400 dark:via-pink-500 dark:to-pink-600' },
  { name: 'Purple', value: 'purple', gradient: 'from-purple-400 via-purple-500 to-purple-600', dark: 'dark:from-purple-500 dark:via-purple-600 dark:to-purple-700' },
  { name: 'Blue', value: 'blue', gradient: 'from-blue-400 via-blue-500 to-blue-600', dark: 'dark:from-blue-500 dark:via-blue-600 dark:to-blue-700' },
];

const getCompletionRate = (habit: Habit) => Math.round((habit.completeDays.length / 40) * 100);

const openHabitModal = ref(false);
const showColorPicker = ref(false);
const selectedColor = ref('gold');
const colorPickerRef = ref<HTMLElement | null>(null);

// Close color picker when clicking outside
onMounted(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (showColorPicker.value && colorPickerRef.value && !colorPickerRef.value.contains(event.target as Node)) {
      showColorPicker.value = false;
    }
  };
  document.addEventListener('click', handleClickOutside);
  onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
  });
});

// Delete habit
const confirmDeleteHabit = ref(false);
const confirmationText = ref('');

const openDeleteConfirmation = (habit: Habit) => {
  confirmDeleteHabit.value = true;
};

const closeDeleteConfirmation = () => {
  confirmationText.value = '';
  confirmDeleteHabit.value = false;
};

const { mutate: deleteHabit } = useMutation({
  mutation: (habit: Habit) => $fetch(`/api/habits/${habit.id}`, { method: 'DELETE' }),

  async onSuccess() {
    await queryCache.invalidateQueries({ active: true });
  },
});

// Edit habit
const editingHabit = ref<number | null>(null);
const edit = ref<{ title: string; description: string; habitView: boolean; enableColorPicker: boolean }>({ title: '', description: '', habitView: false, enableColorPicker: false });

const editHabit = (habit: Habit) => {
  editingHabit.value = habit.id;
  edit.value = { title: habit.title, description: habit.description || '', habitView: habit.habitView, enableColorPicker: habit.enableColorPicker ?? false };
};

const { mutate: saveHabit } = useMutation({
  mutation: () =>
    $fetch(`/api/habits/${editingHabit.value}`, {
      method: 'PATCH',
      body: {
        title: edit.value.title,
        description: edit.value.description,
        habitView: edit.value.habitView,
        enableColorPicker: edit.value.enableColorPicker,
      },
    }),

  async onSuccess() {
    await queryCache.invalidateQueries({ active: true });
    editingHabit.value = null;
  },
});

const cancelEdit = () => {
  editingHabit.value = null;
};

const isTodayCompleted = (habit: Habit) => habit.completeDays.some((day) => {
  const date = typeof day === 'string' ? day : day.date;
  return isSameDay(parseISO(date), new Date());
});

const { mutate: toggleTodayCompletion } = useMutation({
  mutation: ({ habit, color }: { habit: Habit; color?: string }) => {
    const isCompletedToday = habit.completeDays.some((day) => {
      const date = typeof day === 'string' ? day : day.date;
      return isSameDay(parseISO(date), new Date());
    });

    const updatedCompleteDays = isCompletedToday
      ? habit.completeDays.filter((day) => {
          const date = typeof day === 'string' ? day : day.date;
          return !isSameDay(parseISO(date), new Date());
        })
      : [...habit.completeDays, { date: format(new Date(), 'yyyy-MM-dd'), color: color || selectedColor.value }];

    return $fetch(`/api/habits/${habit.id}`, {
      method: 'PATCH',
      body: {
        completeDays: updatedCompleteDays,
      },
    });
  },

  async onSuccess(habit) {
    await queryCache.invalidateQueries({ active: true });
    showColorPicker.value = false;
    const isCompletedToday = habit.completeDays.some((day) => {
      const date = typeof day === 'string' ? day : day.date;
      return isSameDay(parseISO(date), new Date());
    });
    if (isCompletedToday) {
      startConfettiAnimation();
    }
  },
});

const handleCompleteClick = (habit: Habit) => {
  if (isTodayCompleted(habit)) {
    // If already completed, undo completion
    toggleTodayCompletion({ habit });
  } else {
    // If not completed and color picker is enabled, show color picker
    if (habit.enableColorPicker) {
      selectedColor.value = 'gold';
      showColorPicker.value = true;
    } else {
      // Otherwise complete with default color
      toggleTodayCompletion({ habit, color: 'gold' });
    }
  }
};

const handleColorSelect = (habit: Habit, color: string) => {
  toggleTodayCompletion({ habit, color });
};
</script>

<template>
  <ContentBox class="mx-4 mb-4 flex cursor-pointer gap-3 bg-neutral-400/5 p-3 transition hover:bg-white/5 active:scale-[.975]" @click="openHabitModal = true">
    <div class="flex flex-1 flex-col justify-center gap-1">
      <div class="text-md line-clamp-1 font-medium text-white">{{ habit.title }}</div>
      <div class="line-clamp-3 text-xs text-white/70" v-html="renderMarkdown(habit.description || '')"></div>
    </div>
    <HabitHeatmap :habit="habit" :habitDays="49" />
  </ContentBox>
  <UModal
    v-model="openHabitModal"
    :ui="{ container: 'items-center', background: '', shadow: '', overlay: { base: 'backdrop-blur-2xl', background: 'bg-white/5 dark:bg-black/60' } }">
    <div class="flex flex-col gap-4">
      <ContentBox class="flex flex-col gap-2.5 bg-white/10 p-2.5 dark:bg-neutral-400/5">
        <div class="flex w-full items-center justify-between gap-2.5 px-0.5 text-white/25 dark:text-white/15">
          <div class="text-xs">
            Completion Rate:
            <strong>{{ getCompletionRate(habit) }}%</strong>
          </div>
          <UProgress
            :value="getCompletionRate(habit)"
            size="xs"
            :ui="{
              wrapper: 'flex-1',
              progress: {
                color: 'text-white/25 dark:text-white/15',
                track:
                  '[&::-webkit-progress-bar]:bg-white/10 [&::-webkit-progress-bar]:dark:bg-white/5 [@supports(selector(&::-moz-progress-bar))]:bg-white/10 [@supports(selector(&::-moz-progress-bar))]:dark:bg-white/5',
              },
            }" />
          <div class="text-xs">
            Today:
            <strong>
              {{ isTodayCompleted(habit) ? 'Completed' : 'Pending' }}
            </strong>
          </div>
        </div>
        <HabitHeatmap :habit="habit" :habitDays="343" />
      </ContentBox>
      <div class="flex flex-col gap-4 px-3 text-white">
        <div class="flex items-center justify-between gap-3">
          <UInput v-if="editingHabit === habit.id" :ui="{ wrapper: 'flex-1', rounded: 'rounded-full', size: { sm: 'text-sm font-semibold' } }" v-model="edit.title" />
          <div v-else class="line-clamp-1 text-xl font-semibold">{{ habit.title }}</div>
          <div v-if="isMyProfile" class="flex items-center gap-3">
            <div class="relative">
              <button
                @click.stop="handleCompleteClick(habit)"
                class="button px-2.5 py-1.5 font-semibold outline-none"
                :class="isTodayCompleted(habit) ? 'bg-white/10 hover:bg-white/25' : 'bg-green-500 hover:bg-green-400 dark:bg-green-400 dark:text-green-950 dark:hover:bg-green-300'">
                <UIcon v-if="!isTodayCompleted(habit)" name="i-heroicons-check-16-solid" class="h-5 w-5" />
                {{ isTodayCompleted(habit) ? 'Undo' : 'Complete' }}
              </button>

              <!-- Color picker -->
              <div v-if="showColorPicker" ref="colorPickerRef" @click.stop class="absolute right-0 top-full z-50 mt-2 rounded-xl bg-black/80 p-3 shadow-xl backdrop-blur-xl border border-white/10">
                <div class="mb-2 text-xs font-medium text-white/70">Select Color</div>
                <div class="flex gap-2">
                  <button
                    v-for="color in qualityColors"
                    :key="color.value"
                    @click="handleColorSelect(habit, color.value)"
                    :class="[
                      'h-8 w-8 rounded-lg bg-gradient-to-tr shadow-md transition hover:scale-110 active:scale-95',
                      color.gradient,
                      color.dark
                    ]"
                    :title="color.name">
                  </button>
                </div>
              </div>
            </div>

            <UPopover :popper="{ placement: 'bottom-end' }" :ui="{ background: '', shadow: '', ring: '' }">
              <button class="button bg-white/10 p-1.5 hover:bg-white/25">
                <UIcon name="i-heroicons-ellipsis-horizontal-20-solid" class="h-5 w-5" />
              </button>
              <template #panel="{ close }">
                <div class="dropdown">
                  <div
                    @click="
                      () => {
                        close();
                        editHabit(habit);
                      }
                    "
                    class="m-1 flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-black/30">
                    <UIcon name="i-heroicons-pencil-square-20-solid" class="h-5 w-5" />
                    <span>Edit</span>
                  </div>
                  <div class="border-b border-white/5"></div>
                  <div
                    @click="
                      () => {
                        close();
                        openDeleteConfirmation(habit);
                      }
                    "
                    class="m-1 flex cursor-pointer items-center gap-3 rounded-lg p-2 transition hover:bg-black/30 dark:text-red-500 dark:hover:bg-red-900/30">
                    <UIcon name="i-heroicons-trash-20-solid" class="h-5 w-5" />
                    <span>Delete</span>
                  </div>
                </div>
              </template>
            </UPopover>
          </div>
        </div>
        <ContentBox class="flex flex-col gap-2 bg-white/10 p-4 backdrop-blur-2xl dark:bg-neutral-200/5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2 text-xs font-medium text-white/50">
              <p>{{ format(habit.createdAt, 'MMM d, yyyy') }}</p>
              <UIcon v-if="isMyProfile" :name="habit.habitView ? 'i-heroicons-eye-20-solid' : 'i-heroicons-eye-slash-20-solid'" class="-mt-0.5 h-4 w-4" />
            </div>
          </div>
          <div class="max-h-[calc(100vh-23rem)] overflow-y-auto">
            <UTextarea v-if="editingHabit === habit.id" v-model="edit.description" autoresize />
            <div v-else class="prose prose-sm prose-invert" v-html="renderMarkdown(habit.description || '')"></div>
          </div>
          <div v-if="editingHabit === habit.id" class="mt-2 flex flex-col gap-2">
            <div class="flex items-center justify-between text-sm">
              <div>
                Visibility:
                <strong>{{ edit.habitView ? 'Public' : 'Private' }}</strong>
              </div>
              <UToggle v-model="edit.habitView" />
            </div>
            <div class="flex items-center justify-between text-sm">
              <div>
                Color Selection:
                <strong>{{ edit.enableColorPicker ? 'Enabled' : 'Disabled' }}</strong>
              </div>
              <UToggle v-model="edit.enableColorPicker" />
            </div>
          </div>
        </ContentBox>
        <div v-if="editingHabit === habit.id" class="flex items-center justify-between">
          <div></div>
          <div class="flex gap-2">
            <UButton :ui="{ rounded: 'rounded-full' }" @click="cancelEdit" color="white" variant="link">Cancel</UButton>
            <UButton :ui="{ rounded: 'rounded-full' }" @click="saveHabit" trailing>Save changes</UButton>
          </div>
        </div>
      </div>
    </div>
    <UModal v-model="confirmDeleteHabit" :ui="{ width: 'w-80', rounded: 'rounded-2xl' }">
      <UCard :ui="{ ring: '', divide: 'divide-y divide-gray-100 dark:divide-gray-800' }">
        <template #header>
          <div class="flex items-center justify-between">
            <h3 class="text-base font-semibold leading-6 text-gray-900 dark:text-white">Are you sure?</h3>
            <UButton color="gray" variant="ghost" icon="i-heroicons-x-mark-20-solid" class="-my-1" @click="closeDeleteConfirmation" />
          </div>
        </template>
        <div class="flex flex-col gap-4">
          <p v-if="habit.completeDays.length > 1" class="text-sm text-red-500">
            Warning: This habit has been completed for {{ habit.completeDays.length }} days. Deleting it will remove all progress.
          </p>
          <p class="text-sm text-neutral-400">
            To confirm deletion, please type
            <strong>DELETE</strong>
            in the box below.
          </p>
          <UInput color="red" v-model="confirmationText" placeholder="Type DELETE here..." />
          <UButton block color="red" :disabled="confirmationText.toLowerCase() !== 'delete'" @click="deleteHabit(habit)">I understand, delete this habit</UButton>
        </div>
      </UCard>
    </UModal>
  </UModal>
</template>
