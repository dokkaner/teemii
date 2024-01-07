const Sequelize = require('sequelize')
const { logger } = require('./logger.js')
const fs = require('fs').promises
const path = require('path')

/**
 * Retrieves all migrations and categorizes them into completed and pending.
 *
 * This function reads the migration files from the migration directory and checks
 * against the database to determine which migrations have been completed and which
 * are still pending.
 *
 * @returns {Promise<Object>} An object containing arrays of all migrations,
 *                            completed migrations, and pending migrations.
 */
const getAllMigrations = async (db) => {
  try {
    logger.info('Retrieving migrations')
    // Construct the path to the migrations directory
    const migrationsDir = path.join(process.cwd(), '/migrations')

    // Read the list of migration files asynchronously
    const migrations = await fs.readdir(migrationsDir)
    const migrationNameRegex = /^\d{14}-.+\.js$/
    const validMigrations = migrations.filter(filename => migrationNameRegex.test(filename))

    // Fetch the list of completed migrations from the database
    const dbMigrations = await db.query('SELECT * FROM `SequelizeMeta`', {
      type: Sequelize.QueryTypes.SELECT
    })

    // Convert the list of completed migrations into a Set for efficient lookup
    const dbMigrationsSet = new Set(dbMigrations.map(({ name }) => name))
    const pendingMigrations = []
    const completedMigrations = []

    // Categorize each migration as either completed or pending
    for (const migration of validMigrations) {
      if (dbMigrationsSet.has(migration)) {
        completedMigrations.push(migration)
      } else {
        pendingMigrations.push(migration)
      }
    }

    logger.info(`Retrieved migrations successfully: ${completedMigrations.length} completed, ${pendingMigrations.length} pending`)
    return {
      validMigrations,
      completedMigrations,
      pendingMigrations
    }
  } catch (error) {
    if (error.message?.includes('no such table: SequelizeMeta')) {
      logger.warn('No migrations found in database')
      // If the SequelizeMeta table does not exist, then no migrations have been run yet
      // create the table and return an empty list of migrations
      await db.query('CREATE TABLE `SequelizeMeta` (`name` VARCHAR(255) NOT NULL UNIQUE PRIMARY KEY);')
      return {
        migrations: [],
        completedMigrations: [],
        pendingMigrations: []
      }
    } else {
      throw new Error(`Failed to retrieve migrations: ${error}`)
    }
  }
}

/**
 * Applies all pending migrations.
 *
 * This function retrieves a list of all pending migrations and applies each
 * sequentially. After each migration, it records the migration in the database.
 * It returns the results of all migrations.
 *
 * @returns {Promise<Array>} An array of results from each migration.
 */
const UpAllMigration = async (db) => {
  try {
    const { pendingMigrations } = await getAllMigrations(db)

    if (pendingMigrations.length === 0) {
      return []
    }

    logger.info(`Applying ${pendingMigrations.length} migrations`)
    const output = []

    for (const migrationName of pendingMigrations) {
      const migrationPath = path.join(process.cwd(), '/migrations', migrationName)
      const migration = require(migrationPath)

      try {
        const result = await migration.up(db.queryInterface, Sequelize)

        await db.query('INSERT INTO `SequelizeMeta` (name) VALUES (:name)', {
          type: Sequelize.QueryTypes.INSERT,
          replacements: { name: migrationName }
        })

        output.push(result)
        logger.info(`- Applied migration ${migrationName} successfully`)
      } catch (error) {
        if (error.message?.includes('duplicate column name:')) {
          logger.warn(`Migration ${migrationName} already applied`)
        } else {
          throw new Error(`Error applying migration ${migrationName}: ${error.message}`)
        }
      }
    }
    return output
  } catch (error) {
    throw new Error(`Error in UpAllMigration: ${error.message}`)
  }
}

/**
 * Reverts all completed migrations.
 *
 * This function retrieves a list of all completed migrations and reverts each
 * sequentially. After each migration, it removes the migration record from the database.
 * It returns the results of all reverted migrations.
 *
 * @returns {Promise<Array>} An array of results from each reverted migration.
 */

// eslint-disable-next-line no-unused-vars
const downAllMigration = async (db) => {
  try {
    const { completedMigrations } = await getAllMigrations(db)

    if (completedMigrations.length === 0) {
      return []
    }

    logger.info(`Reverting ${completedMigrations.length} migrations`)
    const output = []

    // Iterate in reverse order to revert the most recent migration first
    for (const migrationName of completedMigrations.reverse()) {
      // Dynamically require the migration module
      const migrationPath = path.join(process.cwd(), '/migrations', migrationName)
      const migration = require(migrationPath)

      // Execute the 'down' method of the migration
      const result = await migration.down(db.queryInterface, Sequelize)

      // Remove the migration record from the database
      await db.query('DELETE FROM `SequelizeMeta` WHERE name = :name', {
        type: Sequelize.QueryTypes.DELETE,
        replacements: { name: migrationName }
      })

      output.push(result)
      logger.info(`- Reverted migration ${migrationName} successfully`)
    }

    return output
  } catch (error) {
    throw new Error(`Error in downAllMigration: ${error.message}`)
  }
}

/**
 * Reverts the most recently completed migration.
 *
 * This function retrieves the latest migration from the list of completed migrations,
 * reverts it, and removes its record from the database.
 * It returns the results of the reverted migration and the database operation.
 *
 * @returns {Promise<Array>} An array containing the result of the reverted migration and the database deletion operation.
 */
// eslint-disable-next-line no-unused-vars
const downLatestMigration = async (db) => {
  try {
    const { completedMigrations } = await getAllMigrations(db)
    const output = []

    const latestMigration = completedMigrations[completedMigrations.length - 1]
    if (!latestMigration) {
      return output
    }

    // Dynamically require the latest migration module
    const migrationPath = path.join(process.cwd(), '/migrations', latestMigration)
    const migration = require(migrationPath)

    // Execute the 'down' method of the migration
    const result = await migration.down(db.queryInterface, Sequelize)

    // Remove the migration record from the database
    const saved = await db.query('DELETE FROM `SequelizeMeta` WHERE name = :name', {
      type: Sequelize.QueryTypes.DELETE,
      replacements: { name: latestMigration }
    })

    output.push(result)
    output.push(saved)

    return output
  } catch (error) {
    throw new Error(`Error in downLatestMigration: ${error.message}`)
  }
}

class ORMService {
  constructor () {
    this.sequelize = null
    this.Sequelize = null
  }

  async checkApplyMigrations () {
    return await UpAllMigration(this.sequelize)
    // await downAllMigration(this.sequelize)
  }

  async connect (conf) {
    const sequelize = new Sequelize({
      dialect: conf.dialect,
      storage: conf.storage,
      logging: conf.logging
    })

    try {
      await sequelize.authenticate()
      logger.trace('✓ sequelize Initialized')

      const [results] = await sequelize.query('PRAGMA integrity_check;')
      const checkResult = results[0].integrity_check
      if (checkResult === 'ok') {
        logger.trace('✓ Database integrity check passed')
      } else {
        logger.error(`Database integrity check failed: ${checkResult}`)
      }

      this.sequelize = sequelize
      this.Sequelize = Sequelize
    } catch (e) {
      logger.error({ err: e }, '✗ Database connection failed')
      throw e
    }
  }
}

const orm = new ORMService()

module.exports = { orm }
