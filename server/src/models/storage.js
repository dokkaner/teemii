module.exports = (sequelize, DataTypes) => {
  const Storage = sequelize.define(
    'storage',
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4
      },
      callerId: {
        allowNull: true,
        type: DataTypes.STRING,
        primaryKey: true
      },
      type: {
        allowNull: true,
        type: DataTypes.STRING,
        primaryKey: true
      },
      key: {
        allowNull: true,
        type: DataTypes.STRING,
        primaryKey: true
      },
      value: {
        allowNull: true,
        type: DataTypes.STRING
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      }
    },
    {
      freezeTableName: true,
      timestamps: false,
      sequelize,
      modelName: 'storage'
    }
  )

  Storage.associate = function (models) {
    // associations can be defined here
  }
  return Storage
}
