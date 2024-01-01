module.exports = (sequelize, DataTypes) => {
  const EntityJob = sequelize.define(
    'entityJob',
    {
      entityId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false
      },
      jobId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: 'job', key: 'id' }
      }
    },
    {
      freezeTableName: true,
      timestamps: false,
      sequelize,
      modelName: 'entityJob'
    }
  )

  EntityJob.associate = function (models) {

  }
  return EntityJob
}
