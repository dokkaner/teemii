<template>
  <div v-if="shouldShowPagination" class="mt-4 flex items-center justify-between bg-white">
    <!-- mobile -->
    <div class="flex flex-1 justify-between sm:hidden">
      <router-link :to="anchor" :class="{
          'disabled pointer-events-none cursor-default !bg-main-100 !text-main-400': Number(pagination.currentPage) === 1,
        }"
         class="relative inline-flex items-center rounded-md border-none border-main-300 bg-white px-4 py-2 text-sm font-medium text-main-700 hover:bg-main-50"
         @click="previousPage()"
      >
        Previous
      </router-link>

      <router-link :to="anchor" :class="{
          'disabled pointer-events-none cursor-default !bg-main-100 !text-main-400': Number(pagination.currentPage) === Number(pagination.totalPages),
          }"
         class="relative ml-3 inline-flex items-center rounded-md border-none border-main-300 bg-white px-4 py-2 text-sm font-medium text-main-700 hover:bg-main-50"
         @click="nextPage()"
      >
        Next
      </router-link>
    </div>
    <!-- end mobile -->
    <div class="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
      <div>
        <p class="text-sm text-main-700">
          Showing {{ ' ' }}
          <span v-if="pagination.limit && pagination.currentPage" class="font-black text-main-700">
            {{ Number(pagination.currentPage) * Number(pagination.limit) - (Number(pagination.limit) - 1) }}
          </span>
          {{ ' ' }} to {{ ' ' }}
          <span v-if="pagination.limit && pagination.currentPage" class="font-black text-main-700">
            <span v-if="Number(pagination.currentPage) * Number(pagination.limit) <= Number(pagination.totalCount)">
              {{ Number(pagination.currentPage) * Number(pagination.limit) }}
            </span>
            <span v-else>
              {{ pagination.totalCount }}
            </span>
          </span>
          {{ ' ' }} of {{ ' ' }}
          <span v-if="pagination.totalCount" class="font-black text-accent-700">
            {{ pagination.totalCount }}
          </span>
          {{ ' ' }} results
        </p>
      </div>
      <div>
        <nav class="relative inline-flex items-center justify-end py-2 text-sm font-medium" aria-label="Pagination">
          <router-link :to="anchor"
             :class="{'disabled pointer-events-none cursor-default !text-main-100': Number(pagination.currentPage) === 1}"
             class="relative inline-flex items-center rounded-l-md border-none border-main-300 bg-white p-2 text-sm font-medium text-main-500 hover:bg-main-50"
             @click="previousPage()">
            <span class="sr-only">Previous</span>
            <ChevronLeftIcon class="h-5 w-5" aria-hidden="true"/>
          </router-link>
          <router-link
              v-if="hasFirst" :to="anchor" aria-current="page"
              :class="{'z-10 border-b-2 border-accent-500 bg-accent-50 font-medium text-accent-600': isActive(1),
                       'border-main-300 bg-white text-main-400 hover:bg-accent-50 hover:text-accent-400':!isActive(1),
                      }"
              class="relative inline-flex items-center px-4 py-2 text-sm font-medium"
              @click="nextPage()"
          >
            1
          </router-link>

          <span v-if="hasFirstEllipsis"
                class="relative inline-flex items-center border-none border-main-300 px-4 py-2 text-sm text-main-500">
            ...
          </span>
          <router-link
              v-for="page in pages"
              :key="page"
              :to="anchor"
              :class="{'z-10 border-b-2 border-accent-500 bg-accent-50 font-medium text-accent-600': isActive(page),
                       'border-main-300 bg-white text-main-400 hover:bg-accent-50 hover:text-accent-400': !isActive(page),
              disabled: page === '...',
            }"
              class="relative hidden items-center px-4 py-2 text-sm font-medium md:inline-flex"
              @click="pageClicked(page)"
          >
            {{ page }}
          </router-link>

          <span
              v-if="hasLastEllipsis"
              class="relative inline-flex items-center border-none border-main-300 bg-white px-4 py-2 text-sm font-medium text-main-700"
          > ...
          </span>
          <router-link
              v-if="hasLast"
              :to="anchor"
              aria-current="page"
              :class="{
              'z-10 border-b-2 border-accent-500 bg-accent-50 font-medium text-accent-600': isActive(pagination.totalPages),
              'border-main-300 bg-white text-main-400 hover:bg-accent-50 hover:text-accent-400': !isActive(pagination.totalPages),
            }"
              class="relative inline-flex items-center border-none px-4 py-2 text-sm font-medium"
              @click="pageClicked(pagination.totalPages)"
          >
            {{ pagination.totalPages }}
          </router-link>
          <router-link :to="anchor"
             class="relative inline-flex items-center rounded-r-md border-none border-main-300 bg-white p-2 text-sm font-medium text-main-500 hover:bg-main-50"
             :class="{'disabled pointer-events-none cursor-default !text-main-100': Number(pagination.currentPage) === Number(pagination.totalPages)}"
             @click="pageClicked(Number(pagination.currentPage) + 1)">
            <span class="sr-only">Next</span>
            <ChevronRightIcon class="h-5 w-5" aria-hidden="true"/>
          </router-link>
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
    isActive (page) {
      const currentPage = Number(this.pagination.currentPage) || 1
      return currentPage === page
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
    pageClicked (page) {
      if (
        page === '...' ||
          page === this.pagination.currentPage ||
          page > this.pagination.totalPages ||
          page < 1
      ) {
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
