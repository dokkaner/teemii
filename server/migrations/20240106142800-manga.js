'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return await queryInterface.addColumn('manga', 'visibility', {
      type: Sequelize.DataTypes.ENUM,
      values: ['Public', 'Restricted', 'Private'],
      defaultValue: 'Public'
    })
  },

  async down (queryInterface, Sequelize) {
    return await queryInterface.removeColumn('manga', 'trackingIDs')
  }
}
