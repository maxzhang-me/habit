<script setup lang="ts">
const props = defineProps<{ habit: Habit; habitDays: number }>();

// Color gradient configurations for habit completion
const colorGradients: Record<string, { gradient: string; dark: string; chipBg: string; chipText: string }> = {
  gold: {
    gradient: 'from-yellow-300 via-yellow-400 to-yellow-500',
    dark: 'dark:from-yellow-400 dark:via-yellow-500 dark:to-yellow-600',
    chipBg: 'bg-yellow-950/80',
    chipText: 'text-yellow-400',
  },
  red: {
    gradient: 'from-red-400 via-red-500 to-red-600',
    dark: 'dark:from-red-500 dark:via-red-600 dark:to-red-700',
    chipBg: 'bg-red-950/80',
    chipText: 'text-red-400',
  },
  pink: {
    gradient: 'from-pink-300 via-pink-400 to-pink-500',
    dark: 'dark:from-pink-400 dark:via-pink-500 dark:to-pink-600',
    chipBg: 'bg-pink-950/80',
    chipText: 'text-pink-400',
  },
  purple: {
    gradient: 'from-purple-400 via-purple-500 to-purple-600',
    dark: 'dark:from-purple-500 dark:via-purple-600 dark:to-purple-700',
    chipBg: 'bg-purple-950/80',
    chipText: 'text-purple-400',
  },
  blue: {
    gradient: 'from-blue-400 via-blue-500 to-blue-600',
    dark: 'dark:from-blue-500 dark:via-blue-600 dark:to-blue-700',
    chipBg: 'bg-blue-950/80',
    chipText: 'text-blue-400',
  },
};

const getDayCompletion = (date: string) => {
  return props.habit.completeDays.find((day) => {
    const dayDate = typeof day === 'string' ? day : day.date;
    return dayDate === date;
  });
};

const getDayColor = (date: string) => {
  const completion = getDayCompletion(date);
  if (!completion) return null;
  const color = typeof completion === 'string' ? 'gold' : completion.color;
  return colorGradients[color] || colorGradients.gold;
};

const isCompleted = (date: string) => {
  return !!getDayCompletion(date);
};
</script>

<template>
  <div class="flex h-full overflow-hidden rounded-xl" dir="rtl">
    <div class="flex gap-0.5" dir="ltr">
      <div v-for="(week, weekIndex) in generateWeeks(props.habitDays)" :key="weekIndex" class="flex flex-col gap-0.5">
        <div v-for="(day, dayIndex) in week" :key="dayIndex">
          <UTooltip :popper="{ placement: 'top' }" :ui="{ wrapper: '', background: '', ring: '', shadow: '', base: '' }">
            <div
              :class="[
                'day',
                isCompleted(day.date) && getDayColor(day.date) ? ['active', 'bg-gradient-to-tr', getDayColor(day.date)?.gradient, getDayColor(day.date)?.dark] : ''
              ]">
            </div>
            <template #text>
              <div
                :class="[
                  'chip',
                  isCompleted(day.date) ? [getDayColor(day.date)?.chipBg, getDayColor(day.date)?.chipText] : ''
                ]">
                {{ formatDate(day.date) }}
              </div>
            </template>
          </UTooltip>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="postcss" scoped>
.day {
  @apply flex h-2.5 w-2.5 rounded-sm bg-white/5;
  &.active {
    @apply shadow-sm;
  }
}

.chip {
  font-size: 0.75rem;
  box-shadow:
    inset 0.5px 0.5px 1px 0px rgba(255, 255, 255, 0.1),
    inset -0.5px -0.5px 1px 0px rgba(0, 0, 0, 0.1),
    rgba(0, 0, 0, 0.2) 0px 3px 10px -5px;
  @apply flex select-none items-center justify-center rounded-full bg-black/40 px-2.5 py-0.5 text-white dark:bg-black/80;
}
</style>
