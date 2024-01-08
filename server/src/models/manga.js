module.exports = (sequelize, DataTypes) => {
  const Manga = sequelize.define(
    'manga',
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      slug: {
        allowNull: false,
        type: DataTypes.STRING,
        primaryKey: true
      },
      type: {
        allowNull: true,
        type: DataTypes.STRING
      },
      publicationDemographics: {
        allowNull: true,
        type: DataTypes.STRING
      },
      genres: {
        allowNull: false,
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      tags: {
        allowNull: false,
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      canonicalTitle: {
        allowNull: true,
        type: DataTypes.STRING
      },
      primaryAltTitle: {
        allowNull: true,
        type: DataTypes.STRING
      },
      titles: {
        allowNull: false,
        type: DataTypes.JSON
      },
      altTitles: {
        allowNull: true,
        type: DataTypes.JSON
      },
      synopsis: {
        allowNull: true,
        type: DataTypes.JSON
      },
      description: {
        allowNull: true,
        type: DataTypes.JSON
      },
      status: {
        allowNull: true,
        type: DataTypes.STRING
      },
      isLicensed: {
        allowNull: true,
        type: DataTypes.BOOLEAN
      },
      bannerImage: {
        allowNull: true,
        type: DataTypes.JSON
      },
      posterImage: {
        allowNull: true,
        type: DataTypes.JSON
      },
      coverImage: {
        allowNull: true,
        type: DataTypes.JSON
      },
      color: {
        allowNull: true,
        type: DataTypes.STRING
      },
      chapterCount: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      volumeCount: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      serialization: {
        allowNull: true,
        type: DataTypes.STRING
      },
      lastChapter: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      lastRelease: {
        allowNull: true,
        type: DataTypes.DATE
      },
      nextRelease: {
        allowNull: true,
        type: DataTypes.DATE
      },
      averageReleaseInterval: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      popularityRank: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      favoritesCount: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      score: {
        allowNull: true,
        type: DataTypes.DECIMAL
      },
      userRating: {
        allowNull: true,
        type: DataTypes.DECIMAL,
        defaultValue: 2.5
      },
      contentRating: {
        allowNull: true,
        type: DataTypes.STRING
      },
      originalLanguage: {
        allowNull: true,
        type: DataTypes.STRING
      },
      startYear: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      endYear: {
        allowNull: true,
        type: DataTypes.NUMBER
      },
      authors: {
        allowNull: true,
        type: DataTypes.JSON
      },
      publishers: {
        allowNull: true,
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      chapterNumbersResetOnNewVolume: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      externalIds: {
        allowNull: true,
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      externalLinks: {
        allowNull: true,
        type: DataTypes.JSON
      },
      censorship: {
        allowNull: true,
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
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
      monitor: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      bookmark: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      readed: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      readProgress: {
        type: DataTypes.NUMBER,
        defaultValue: 0
      },
      scrobblersKey: {
        allowNull: true,
        type: DataTypes.JSON
      },
      visibility: {
        type: DataTypes.ENUM,
        values: ['Public', 'Restricted', 'Private'],
        defaultValue: 'Public'
      }
    },
    {
      freezeTableName: true,
      timestamps: false,
      sequelize,
      modelName: 'manga'
    }
  )

  return Manga
}
