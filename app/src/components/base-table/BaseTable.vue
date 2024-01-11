<template>
  <div class="flex-col flow-root">
    <div class="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8 pb-4 lg:pb-0">
      <div class="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
        <div
            class="relative overflow-hidden border-b border-light-200 dark:border-darkLight-500 shadow sm:rounded-lg">
          <slot name="header"/>
          <table :class="tableClass" aria-describedby="table">
            <thead :class="theadClass">
            <tr>
              <th v-for="column in tableColumns" :key="column.key" :class="[getThClass(column),
                    { 'text-bold text-black': sort.fieldName === column.key, }, ]" @click="changeSorting(column)">
                {{ column.label }}
                <span v-if="sort.fieldName === column.key && sort.order === 'asc'" class="asc-direction">↑</span>
                <span v-if=" sort.fieldName === column.key && sort.order === 'desc'" class="desc-direction">↓</span>
              </th>
            </tr>
            </thead>
            <tbody v-if="loadingType === 'placeholder' && (loading || isLoading)">
            <tr v-for="placeRow in placeholderCount" :key="placeRow"
                :class="placeRow % 2 === 0 ? 'bg-white dark:bg-darkMain-600/90' : 'bg-light-50 dark:bg-darkMain-600'">
              <td v-for="column in columns" :key="column.key" class="" :class="getTdClass(column)">
                <TBaseContentPlaceholders :class="getPlaceholderClass(column)" :rounded="true">
                  <TBaseContentPlaceholdersText class="w-full h-6" :lines="1"/>
                </TBaseContentPlaceholders>
              </td>
            </tr>
            </tbody>
            <tbody v-else>
            <tr v-for="(row, index) in sortedRows" :key="index"
                :class="index % 2 === 0 ? 'bg-white dark:bg-darkMain-600/90' : 'bg-light-50 dark:bg-darkMain-600'">
              <td v-for="column in columns" :key="column.key" class="" :class="getTdClass(column)">
                <slot :name="'cell-' + column.key" :row="row">
                  {{ lodashGet(row.data, column.key) }}
                </slot>
              </td>
            </tr>
            </tbody>
          </table>

          <div v-if="loadingType === 'spinner' && (loading || isLoading)"
               class="absolute top-0 left-0 z-10 flex items-center justify-center w-full h-full bg-white bg-opacity-60">
            <span>
              <svg class="h-3 w-3 animate-spin text-accent-500" xmlns="http://www.w3.org/2000/svg" fill="none"
                   viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"></circle>
              <path class="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
          </div>

          <div v-else-if="!loading && !isLoading && sortedRows && sortedRows.length === 0"
               class="text-center text-light-500 pb-2 flex h-[160px] justify-center items-center flex-col">
            <TBaseIcon name="ExclamationCircleIcon" class="w-6 h-6 text-light-400"/>
            <span class="block mt-1">{{ noResultsMessage }}</span>
          </div>

          <BaseTablePagination v-if="pagination" :pagination="pagination" @pageChange="pageChange"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, watch, ref, reactive } from 'vue'
import { get } from 'lodash'
import Row from './Row'
import Column from './Column'
import BaseTablePagination from './BaseTablePagination.vue'
import TBaseContentPlaceholders from '@/components/base/TBaseContentPlaceholders.vue'
import TBaseContentPlaceholdersText from '@/components/base/TBaseContentPlaceholdersText.vue'
import TBaseIcon from '@/components/base/TBaseIcon.vue'

const props = defineProps({
  columns: {
    type: Array,
    required: true,
  },
  data: {
    type: [Array, Function],
    required: true,
  },
  sortBy: { type: String, default: '' },
  sortOrder: { type: String, default: '' },
  tableClass: {
    type: String,
    default: 'min-w-full divide-y divide-light-200 dark:divide-darkMain-500',
  },
  theadClass: { type: String, default: 'bg-light-50 dark:bg-darkMain-800' },
  tbodyClass: { type: String, default: '' },
  noResultsMessage: {
    type: String,
    default: 'No Results Found',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingType: {
    type: String,
    default: 'placeholder',
    validator: function (value) {
      return ['placeholder', 'spinner'].indexOf(value) !== -1
    },
  },
  placeholderCount: {
    type: Number,
    default: 3,
  },
})

let rows = reactive([])
let isLoading = ref(false)

let tableColumns = reactive(props.columns.map((column) => new Column(column)))

let sort = reactive({
  fieldName: '',
  order: '',
})

let pagination = ref('')

const usesLocalData = computed(() => {
  return Array.isArray(props.data)
})

const sortedRows = computed(() => {
  if (!usesLocalData.value) {
    return rows.value
  }

  if (sort.fieldName === '') {
    return rows.value
  }

  if (tableColumns.length === 0) {
    return rows.value
  }

  const sortColumn = getColumn(sort.fieldName)

  if (!sortColumn) {
    return rows.value
  }

  let sorted = [...rows.value].sort(
      sortColumn.getSortPredicate(sort.order, tableColumns)
  )

  return sorted
})

function getColumn (columnName) {
  return tableColumns.find((column) => column.key === columnName)
}

function getThClass (column) {
  let classes =
      'whitespace-nowrap px-6 py-3 text-left text-xs font-medium text-main-500 uppercase tracking-wider dark:text-light-500'

  if (column.defaultThClass) {
    classes = column.defaultThClass
  }

  if (column.sortable) {
    classes = `${classes} cursor-pointer`
  } else {
    classes = `${classes} pointer-events-none`
  }

  if (column.thClass) {
    classes = `${classes} ${column.thClass}`
  }

  return classes
}

function getTdClass (column) {
  let classes = 'px-6 py-4 text-sm text-main-500 whitespace-nowrap dark:text-light-300'

  if (column.defaultTdClass) {
    classes = column.defaultTdClass
  }

  if (column.tdClass) {
    classes = `${classes} ${column.tdClass}`
  }

  return classes
}

function getPlaceholderClass (column) {
  let classes = 'w-full'

  if (column.placeholderClass) {
    classes = `${classes} ${column.placeholderClass}`
  }

  return classes
}

function prepareLocalData () {
  pagination.value = null
  return props.data
}

async function fetchServerData () {
  const page = (pagination.value && pagination.value.currentPage) || 1

  isLoading.value = true

  const response = await props.data({
    sort,
    page,
  })

  isLoading.value = false

  pagination.value = response.pagination
  return response.data
}

function changeSorting (column) {
  if (sort.fieldName !== column.key) {
    sort.fieldName = column.key
    sort.order = 'asc'
  } else {
    sort.order = sort.order === 'asc' ? 'desc' : 'asc'
  }

  if (!usesLocalData.value) {
    mapDataToRows()
  }
}

async function mapDataToRows () {
  const data = usesLocalData.value
      ? prepareLocalData()
      : await fetchServerData()

  rows.value = data.map((rowData) => new Row(rowData, tableColumns))
}

async function pageChange (page) {
  pagination.value.currentPage = page
  await mapDataToRows()
}

async function refresh () {
  await mapDataToRows()
}

function lodashGet (array, key) {
  return get(array, key)
}

if (usesLocalData.value) {
  watch(
      () => props.data,
      () => {
        mapDataToRows()
      }
  )
}

onMounted(async () => {
  await mapDataToRows()
})

defineExpose({ refresh })
</script>