const fs = require('fs')
const csv = require('csv-parser')
const sizeof = require('object-sizeof')
const { logger } = require('../loaders/logger')

/**
 * @class TrieNode
 * Represents a node in the trie (prefix tree) for efficient word searching.
 */
class TrieNode {
  constructor () {
    this.children = {}
    this.endOfWord = false
    this.data = new Set() // Holds the complete titles that contain the word.
  }

  // Dummy method to satisfy ESLint
  sizeOf () {
    return sizeof(this)
  }
}

/**
 * @class Trie
 * Represents the prefix tree for efficient word searching.
 * Modified to hold complete titles associated with each word.
 */
class Trie {
  constructor () {
    this.root = new TrieNode()
  }

  // get size of trie and all its nodes
  sizeOf () {
    return this.root.sizeOf()
  }

  /**
   * Inserts a word into the trie and associates it with a title.
   * @param {string} word The word to insert.
   * @param {object} data The data to associate with the word.
   */
  insert (word, data) {
    let current = this.root
    for (const char of word) {
      if (!current.children[char]) {
        current.children[char] = new TrieNode()
      }
      current = current.children[char]
    }
    current.endOfWord = true
    current.data.add(data)
  }

  /**
   * Searches for data in the trie that contain all words in the given query,
   * treating each word in the query as a partial match.
   * Supports partial word matching and limits the number of returned results.
   * @param {string[]} words The list of words (partial matches) to search for.
   * @param {number} limit The maximum number of results to return.
   * @return {object[]} An array of data objects that contain all words in the query.
   */
  search (words, limit) {
    const resultsSets = words.map(word => {
      let current = this.root
      for (const char of word) {
        if (!current.children[char]) {
          return new Set()
        }
        current = current.children[char]
      }
      return new Set(this.collectAllData(current))
    })

    if (resultsSets.some(set => set.size === 0)) return []

    const resultSet = resultsSets.reduce((accumulator, currentSet) => {
      if (!accumulator) return currentSet
      return new Set([...accumulator].filter(item => currentSet.has(item)))
    })

    return Array.from(resultSet).slice(0, limit)
  }

  /**
   * Collects all titles within the subtree of a given trie node.
   * This allows for partial word matching.
   * @param {TrieNode} node The trie node from which to collect titles.
   * @return {Set<string>} A set of titles found within the subtree.
   */
  collectAllData (node) {
    const dataObjects = new Set()
    this._collectAllDataHelper(node, dataObjects)
    return dataObjects
  }

  _collectAllDataHelper (node, dataObjects) {
    if (node.endOfWord) node.data.forEach(dataObject => dataObjects.add(dataObject))
    for (const childNode of Object.values(node.children)) {
      this._collectAllDataHelper(childNode, dataObjects)
    }
  }
}

// Instance of Trie for our index.
const trie = new Trie()

/**
 * Reads a CSV file and creates an index from the title fields.
 * @param {string} filePath Path to the CSV file.
 */
function buildIndexFromCSV (filePath) {
  let indexCount = 0
  try {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        const mangaData = {
          title: row.title,
          mal_id: row.mal_id,
          type: row.type,
          score: row.score,
          image: row.main_picture,
          synopsis: row.synopsis
        }

        const words = mangaData.title.toLowerCase().split(/\s+/)
        words.forEach(word => {
          trie.insert(word, mangaData)
          indexCount++
        })
      })
      .on('end', () => {
        const indexSize = sizeof(trie)
        const indexSizeMB = indexSize / 1024 / 1024
        logger.info('Index successfully processed')
        logger.info(`Index count: ${indexCount} items`)
        logger.info(`Index size: ${indexSizeMB} MB`)
      })
  } catch (error) {
    console.error('Error reading CSV file:', error)
    throw error
  }
}

/**
 * Searches the index using a search query.
 * @param {string} query The query to search for.
 * @param {number} limit The maximum number of results to return.
 * @return {*[]} The complete manga titles containing the query.
 */
function searchInIndex (query, limit = 10) {
  const words = query.toLowerCase().split(/\s+/)
  return trie.search(words, limit)
}

module.exports = {
  buildIndexFromCSV,
  searchInIndex
}
