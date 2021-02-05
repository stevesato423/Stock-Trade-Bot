const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const fs = require('fs');
const path = require('path');
const { eachSeries } = require('async');

export default async function initDb(home) {
  console.log('starting db initialization');

  if (!fs.existsSync(path.resolve(home, 'trader.db'))) {
    // create trader database
    const traderDb = await open({
      filename: path.resolve(home, 'trader.db'),
      driver: sqlite3.cached.Database,
    });
    // initialize trader database
    const queries = `
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE IF NOT EXISTS "strategies" (
        "id"  INTEGER NOT NULL,
        "name"  TEXT NOT NULL UNIQUE,
        PRIMARY KEY("id" AUTOINCREMENT)
      );
      INSERT INTO strategies VALUES(1,'reverse_stock_arbitrage');
      CREATE TABLE IF NOT EXISTS "credentials" (
        "id"  INTEGER NOT NULL CHECK(id=1),
        "credentials"  TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
      );
      CREATE TABLE IF NOT EXISTS "actions" (
        "id"  INTEGER NOT NULL,
        "name"  TEXT NOT NULL UNIQUE,
        PRIMARY KEY("id" AUTOINCREMENT)
      );
      INSERT INTO actions VALUES(1,'BUY');
      INSERT INTO actions VALUES(2,'SELL');
      CREATE TABLE IF NOT EXISTS "status" (
        "id"  INTEGER NOT NULL,
        "name"  TEXT NOT NULL UNIQUE,
        PRIMARY KEY("id" AUTOINCREMENT)
      );
      INSERT INTO status VALUES(1,'PENDING');
      INSERT INTO status VALUES(2,'FILLED');
      INSERT INTO status VALUES(3,'CONFIRMED');
      INSERT INTO status VALUES(4,'NOT_TRIGGERED');
      CREATE TABLE IF NOT EXISTS "trades" (
        "broker"  INTEGER NOT NULL,
        "symbol"  TEXT NOT NULL CHECK(length("symbol") <= 4),
        "time"  TIMESTAMP NOT NULL,
        "action"  INTEGER NOT NULL,
        "quantity"  INTEGER NOT NULL CHECK("quantity" >= 0),
        "status"  INTEGER NOT NULL,
        "last_updated"  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY("symbol","time","broker"),
        FOREIGN KEY("status") REFERENCES "status"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY("action") REFERENCES "actions"("id") ON UPDATE CASCADE ON DELETE RESTRICT,
        FOREIGN KEY("broker") REFERENCES "brokers"("id") ON UPDATE CASCADE ON DELETE RESTRICT
      );
      INSERT INTO trades VALUES(1,'TSLA','2021-01-25 05:58:48',1,1,4,'2021-01-25 06:39:03');
      CREATE TABLE IF NOT EXISTS "brokers" (
        "id"  INTEGER NOT NULL,
        "name"  TEXT NOT NULL UNIQUE,
        "supported"  INTEGER NOT NULL DEFAULT 0,
        PRIMARY KEY("id" AUTOINCREMENT)
      );
      INSERT INTO brokers VALUES(1,'robinhood',1);
      INSERT INTO brokers VALUES(2,'webull',0);
      INSERT INTO brokers VALUES(3,'fidelity',0);
      CREATE TABLE IF NOT EXISTS "api" (
        "id"  INTEGER NOT NULL,
        "service"  TEXT NOT NULL UNIQUE,
        "inputs"  TEXT NOT NULL,
        PRIMARY KEY("id" AUTOINCREMENT)
      );
      INSERT INTO api VALUES(1,'robinhood','["username","password"]');
      INSERT INTO api VALUES(2,'twitter','["bearer_token","client_secret","client_token"]');
      DELETE FROM sqlite_sequence;
      INSERT INTO sqlite_sequence VALUES('strategies',2);
      INSERT INTO sqlite_sequence VALUES('credentials',1);
      INSERT INTO sqlite_sequence VALUES('actions',2);
      INSERT INTO sqlite_sequence VALUES('status',4);
      INSERT INTO sqlite_sequence VALUES('brokers',3);
      INSERT INTO sqlite_sequence VALUES('api',2);
      COMMIT
    `.split(';');
    await eachSeries(queries, async (query) => {
      await traderDb.run(query);
    });

    await traderDb.close();

    console.log('sucessfully initialized trader database');
  }

  if (!fs.existsSync(path.resolve(home, 'twitter.db'))) {
    // create twitter db
    const twitterDb = await open({
      filename: path.resolve(home, 'twitter.db'),
      driver: sqlite3.cached.Database,
    });
    // initialize twitter database
    const queries = `
      PRAGMA foreign_keys=OFF;
      BEGIN TRANSACTION;
      CREATE TABLE IF NOT EXISTS "tweets" (
        "id"  TEXT NOT NULL UNIQUE,
        "author_id"  TEXT NOT NULL,
        "created_at"  TIMESTAMP NOT NULL,
        "text"  TEXT NOT NULL,
        "entities"  TEXT,
        "public_metrics"  TEXT,
        "context_annotations"  TEXT,
        "withheld"  TEXT,
        "geo"  TEXT,
        PRIMARY KEY("id")
      );
      CREATE TABLE IF NOT EXISTS "following" (
        "id"  TEXT NOT NULL,
        "name"  TEXT NOT NULL,
        "username"  TEXT NOT NULL,
        PRIMARY KEY("id")
      );
      INSERT INTO "following" VALUES('44196397','Elon Musk','elonmusk');
      INSERT INTO "following" VALUES('1332370385921306631','Reverse Split Arbitrage','ReverseSplitArb');
      INSERT INTO "following" VALUES('898021206967951360','Tesla Daily','TeslaPodcast');
      COMMIT
    `.split(';');
    await eachSeries(queries, async (query) => {
      await twitterDb.run(query);
    });

    await twitterDb.close();

    console.log('sucessfully initialized twitter database');
  }

  console.log('SQLite database are initialized, if you are having problems, try "rm *.db && npm run postinstall".');
}