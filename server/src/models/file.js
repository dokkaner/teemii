module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define(
    'file',
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      mangaId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      chapterId: {
        allowNull: false,
        type: DataTypes.UUID
      },
      chapterNumber: {
        allowNull: false,
        type: DataTypes.STRING
      },
      pageNumber: {
        allowNull: false,
        type: DataTypes.NUMBER
      },
      relativePath: {
        allowNull: false,
        type: DataTypes.STRING
      },
      path: {
        allowNull: false,
        type: DataTypes.STRING
      },
      fileName: {
        allowNull: false,
        type: DataTypes.STRING
      },
      lang: {
        allowNull: true,
        type: DataTypes.STRING,
        defaultValue: 'en'
      },
      source: {
        allowNull: true,
        type: DataTypes.STRING
      },
      format: {
        allowNull: true,
        type: DataTypes.STRING
      },
      type: {
        allowNull: true,
        type: DataTypes.STRING
      },
      size: {
        allowNull: false,
        type: DataTypes.BIGINT
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
      }
    },
    {
      freezeTableName: true,
      timestamps: false,
      sequelize,
      modelName: 'file'
    }
  )

  File.associate = function (models) {
    // associations can be defined here
  }
  return File
}
