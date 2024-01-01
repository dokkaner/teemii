module.exports = (sequelize, DataTypes) => {
  const Stats = sequelize.define(
    'stats',
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: false
      },
      mangaSlug: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      chapterNumber: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      pageNumber: {
        allowNull: false,
        type: DataTypes.NUMBER
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
      modelName: 'chapter'
    }
  )

  Stats.associate = function (models) {
    // associations can be defined here
  }
  return Stats
}
