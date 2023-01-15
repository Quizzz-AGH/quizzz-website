const mongoose = require("mongoose");
const Ranking = require("./ranking");

const gameHistorySchema = new mongoose.Schema(
  {
    gameType: {
      type: String,
      enum: {
        values: ["ranked", "normal"],
        message: "{VALUE} is not supported",
      },
      require: [true, "gameType must be provided"],
    },
    length: {
      type: Number,
    },
    playerId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      require: [true, "playerId must be provided"],
    },
    opponentId: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
    result: {
      type: String,
      enum: { values: ["win", "lose", "draw"], message: "{VALUE} is not supported" },
      require: [true, "result must be provided"],
    },
    eloBefore: {
      type: Number,
    },
    eloChange: {
      type: Number,
      default: 0,
    },
    expireAt: { type: Date, expires: "3d", default: Date.now },
  },
  { timestamps: true }
);

gameHistorySchema.statics.limitGameHistory = async function (playerId) {
  const result = await this.aggregate([
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $limit: 1000,
    },
    {
      $out: "gamehistories",
    },
  ]);
};

gameHistorySchema.pre("save", async function (next) {
  const userRanking = await Ranking.findOne({ user: this.playerId });

  if (!userRanking) {
    const newRanking = await Ranking.create({ user: this.playerId });
    await updateUserAfterGame(this, newRanking);
    newRanking.save();
    return next();
  }
  await updateUserAfterGame(this, userRanking);
  userRanking.save();
  return next();
});

gameHistorySchema.post("save", async function () {
  await this.constructor.limitGameHistory(this.playerId);
});

const updateUserAfterGame = async function (gameHistory, userRanking) {
  console.log(userRanking);
  if (gameHistory.result === "win") {
    userRanking.gamesWon += 1;
  }
  userRanking.gamesPlayed += 1;
  console.log("1");
  userRanking.winPercentage = (userRanking.gamesWon / userRanking.gamesPlayed) * 100;
  console.log("2");
  gameHistory.eloBefore = userRanking.rankingScore;
  console.log("3");
  userRanking.rankingScore += gameHistory.eloChange;
  console.log("4");
  await userRanking.save();
};

module.exports = mongoose.model("GameHistory", gameHistorySchema);
