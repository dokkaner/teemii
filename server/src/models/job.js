module.exports = (sequelize, DataTypes) => {
  const Job = sequelize.define(
    'job',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      data: {
        type: DataTypes.JSON,
        allowNull: false
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false
      },
      result: {
        type: DataTypes.JSON,
        allowNull: true
      },
      error: {
        type: DataTypes.JSON,
        allowNull: true
      },
      progress: {
        type: DataTypes.JSON,
        allowNull: true
      },
      maxRetries: {
        type: DataTypes.INTEGER,
        defaultValue: 3
      },
      retryInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 1000 // milliseconds
      },
      retryCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      timeout: {
        type: DataTypes.INTEGER,
        defaultValue: 30000 // milliseconds
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      finishedAt: {
        type: DataTypes.DATE,
        allowNull: true // null means not finished yet
      },
      origin: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      freezeTableName: true,
      timestamps: false,
      sequelize,
      modelName: 'chapter'
    }
  )

  Job.associate = function (models) {
    // associations can be defined here
  }
  return Job
}
