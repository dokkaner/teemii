module.exports = (sequelize, DataTypes) => {
  const Suggestion = sequelize.define(
    'suggestion',
    {
      id: {
        allowNull: false,
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      genre: {
        allowNull: false,
        type: DataTypes.JSON,
        defaultValue: '[]'
      },
      title: {
        allowNull: false,
        type: DataTypes.JSON
      },
      desc: {
        allowNull: true,
        type: DataTypes.JSON
      },
      cover: {
        allowNull: true,
        type: DataTypes.JSON
      },
      score: {
        allowNull: true,
        type: DataTypes.DECIMAL
      },
      recommendationScore: {
        allowNull: true,
        type: DataTypes.DECIMAL
      },
      externalIds: {
        allowNull: true,
        type: DataTypes.JSON
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
      modelName: 'suggestion'
    }
  )

  Suggestion.associate = function (models) {
    // associations can be defined here
  }
  return Suggestion
}
