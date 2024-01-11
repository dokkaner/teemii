<template>
  <div v-if="shouldShowPagination" class="mt-4 flex items-center justify-between">
    <!-- Mobile Pagination -->
    <div class="flex flex-1 justify-between sm:hidden">
      <a :href="anchor"
         :class="{
           'cursor-normal disabled pointer-events-none !bg-main-100 !text-main-400': Number(pagination.currentPage) === 1,
           'rounded-md bg-white px-4 py-2 text-sm font-medium text-dark-700 hover:bg-dark-50 dark:bg-darkMain-700 dark:text-darkLight-50 dark:hover:bg-darkAccent-500': true
         }"
         @click="previousPage()">
        Previous
      </a>
      <a :href="anchor"
         :class="{
           'disabled pointer-events-none cursor-default !bg-main-100 !text-main-400': Number(pagination.currentPage) === Number(pagination.totalPages),
           'rounded-md bg-white px-4 py-2 text-sm font-medium text-dark-700 hover:bg-dark-50 dark:bg-darkMain-700 dark:text-darkLight-50 dark:hover:bg-darkAccent-500': true
         }"
         @click="nextPage()">
        Next
      </a>
    </div>
    <!-- End Mobile Pagination -->

    <!-- Desktop Pagination -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <!-- Pagination Info -->
        <p class="text-sm text-dark-700 dark:text-darkLight-50">
          Showing
          <span v-if="pagination.limit && pagination.currentPage"
                class="font-bold text-dark-700 dark:text-darkAccent-400">
            {{ pagination.currentPage * pagination.perPageItems - (pagination.perPageItems - 1) }}
          </span>
          to
          <span v-if="pagination.limit && pagination.currentPage"
                class="font-bold text-dark-700 dark:text-darkAccent-400">
            <span v-if="pagination.currentPage * pagination.perPageItems <= pagination.totalCount">
              {{ pagination.currentPage * pagination.perPageItems }}
            </span>
            <span v-else>
              {{ pagination.totalCount }}
            </span>
          </span>
          of
          <span v-if="pagination.totalCount" class="font-bold text-accent-700 dark:text-darkAccent-400">
            {{ pagination.totalCount }}
          </span>
          results
        </p>
      </div>
      <div>
        <!-- Pagination Controls -->
        <nav class="relative inline-flex items-center justify-end py-2 text-sm font-medium"
             aria-label="Pagination">
          <!-- Previous Page Button -->
          <a :href="anchor"
             :class="getPageClasses('<')"
             @click="pageClicked(pagination.currentPage - 1)">
            <span class="sr-only">Previous</span>
            <ChevronLeftIcon class="h-5 w-5" aria-hidden="true"/>
          </a>
          <!-- Page Number Buttons -->
          <template v-if="hasFirst">
            <a href="#"
               :class="getPageClasses(1)"
               @click="pageClicked(1)">
              1
            </a>
            <span v-if="hasFirstEllipsis"
                  class="relative inline-flex items-center px-4 py-2 text-sm text-dark-500 dark:text-darkLight-300">
              ...
            </span>
          </template>
          <a v-for="page in pages"
             :key="page"
             href="#"
             :class="getPageClasses(page)"
             @click="pageClicked(page)">
            {{ page }}
          </a>
          <template v-if="hasLast">
            <span v-if="hasLastEllipsis" :class="getPageClasses('...')">
              ...
            </span>
            <a href="#"
               :class="getPageClasses(pagination.totalPages)"
               @click="pageClicked(pagination.totalPages)">
              {{ pagination.totalPages }}
            </a>
          </template>
          <!-- Next Page Button -->
          <a :href="anchor"
             :class="getPageClasses('>')"
             @click="pageClicked(pagination.currentPage + 1)">
            <span class="sr-only">Next</span>
            <ChevronRightIcon class="h-5 w-5" aria-hidden="true"/>
          </a>
        </nav>
      </div>
    </div>
  </div>
</template>


<script>
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/vue/24/solid'

export default {
  components: {
    ChevronLeftIcon,
    ChevronRightIcon
  },
  props: {
    anchor: {
      type: String,
      default: '#grid'
    },
    pagination: {
      type: Object,
      default: () => ({})
    }
  },
  computed: {
    pages () {
      return this.pagination.totalPages === undefined ? [] : this.pageLinks()
    },
    hasFirst () {
      return Number(this.pagination.currentPage) >= 4 || Number(this.pagination.totalPages) < 10
    },
    hasLast () {
      return (
          Number(this.pagination.currentPage) <= Number(this.pagination.totalPages) - 3 ||
          Number(this.pagination.totalPages) < 10
      )
    },
    hasFirstEllipsis () {
      return (
          Number(this.pagination.currentPage) >= 4 && Number(this.pagination.totalPages) >= 10
      )
    },
    hasLastEllipsis () {
      return (
          Number(this.pagination.currentPage) <= Number(this.pagination.totalPages) - 3 &&
          Number(this.pagination.totalPages) >= 10
      )
    },
    shouldShowPagination () {
      if (this.pagination.totalPages === undefined) {
        return false
      }
      if (Number(this.pagination.count) === 0) {
        return false
      }
      return Number(this.pagination.totalPages) > 1
    }
  },
  methods: {
    getPageClasses (page) {
      const baseClasses = 'relative inline-flex items-center px-4 py-2 text-sm font-medium'
      const activeClasses = 'border-b-2 border-accent-500 bg-accent-50 text-accent-600 dark:border-darkAccent-400 dark:bg-darkMain-600 dark:text-darkLight-50 rounded-t-md'
      const inactiveClasses = 'bg-white text-dark-400 hover:bg-dark-50 dark:bg-darkMain-700 dark:text-darkLight-300 dark:hover:bg-darkAccent-500 dark:hover:text-light-500'
      const disabledClasses = 'pointer-events-none cursor-default'
      const chevronLeftClasses = 'rounded-l-md border-none border-main-300 bg-white p-2 text-sm font-medium text-main-500 hover:bg-main-50 dark:bg-darkMain-700 dark:hover:bg-darkAccent-500 dark:text-light-600'
      const chevronRightClasses = 'rounded-r-md border-none border-main-300 bg-white p-2 text-sm font-medium text-main-500 hover:bg-main-50 dark:bg-darkMain-700 dark:hover:bg-darkAccent-500 dark:text-light-600'
      const ellipsisClasses = 'relative inline-flex items-center px-4 py-2 text-sm text-dark-500 dark:text-darkLight-300'

      if (page === '...') {
        return `${disabledClasses} ${ellipsisClasses}`
      } else if (page === '<') {
        return `${baseClasses} ${this.pagination.currentPage === 1 ? disabledClasses : chevronLeftClasses}`
      } else if (page === '>') {
        return `${baseClasses} ${this.pagination.currentPage === this.pagination.totalPages ? disabledClasses : chevronRightClasses}`
      }
      return `${baseClasses} ${this.isActive(page) ? activeClasses : inactiveClasses}`
    },
    isActive (page) {
      const currentPage = this.pagination.currentPage || 1
      return currentPage === page
    },
    pageClicked (page) {
      if (
          page === '...' ||
          page === this.pagination.currentPage ||
          page > this.pagination.totalPages ||
          page < 1
      ) {
        return
      }

      this.$emit('pageChange', page)
    },
    previousPage () {
      const page = Number(this.pagination.currentPage) - 1
      if (page < 1) {
        return
      }
      this.$emit('pageChange', Number(page))
    },
    nextPage () {
      const page = Number(this.pagination.currentPage) + 1

      if (page > this.pagination.totalPages) {
        return
      }

      this.$emit('pageChange', Number(page))
    },
    pageLinks () {
      const pages = []
      let left = 2
      let right = this.pagination.totalPages - 1
      if (this.pagination.totalPages >= 10) {
        left = Math.max(1, this.pagination.currentPage - 2)
        right = Math.min(
            this.pagination.currentPage + 2,
            this.pagination.totalPages
        )
      }
      for (let i = left; i <= right; i++) {
        pages.push(i)
      }
      return pages
    }
  }
}
</script>
