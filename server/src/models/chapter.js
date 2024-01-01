module.exports = (sequelize, DataTypes) => {
  const Chapter = sequelize.define(
    'chapter',
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: false
      },
      mangaId: {
        allowNull: false,
        type: DataTypes.UUID,
        primaryKey: true
      },
      titles: {
        allowNull: true,
        type: DataTypes.JSON
      },
      plot: {
        allowNull: true,
        type: DataTypes.JSON
      },
      langAvailable: {
        allowNull: true,
        type: DataTypes.JSON
      },
      posterImage: {
        allowNull: true,
        type: DataTypes.JSON
      },
      volume: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      chapter: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      pages: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      publishAt: {
        allowNull: true,
        type: DataTypes.DATE
      },
      readableAt: {
        allowNull: true,
        type: DataTypes.DATE
      },
      externalIds: {
        allowNull: true,
        type: DataTypes.JSON
      },
      externalLinks: {
        allowNull: true,
        type: DataTypes.JSON
      },
      userRating: {
        allowNull: true,
        type: DataTypes.DECIMAL,
        defaultValue: 2.5
      },
      metadata: {
        allowNull: true,
        type: DataTypes.JSON
      },
      dlSource: {
        allowNull: true,
        type: DataTypes.JSON
      },
      // 0: ADDED, 1: WANTED 2: GRABBED 3:DOWNLOADED 4:ERROR
      state: {
        allowNull: false,
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      isDeleted: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
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
      },
      readProgress: {
        allowNull: true,
        type: DataTypes.NUMBER,
        defaultValue: 0
      }
    },
    {
      freezeTableName: true,
      timestamps: false,
      sequelize,
      modelName: 'chapter'
    }
  )

  Chapter.associate = function (models) {
    // associations can be defined here
  }
  return Chapter
}
