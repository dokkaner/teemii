'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    return await queryInterface.addColumn('manga', 'scrobblersKey', {
      type: Sequelize.DataTypes.JSON,
      allowNull: true
    })
  },

  async down (queryInterface, Sequelize) {
    return await queryInterface.removeColumn('manga', 'trackingIDs')
  }
}
