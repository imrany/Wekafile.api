-- Add up migration script here
create table users(
    email varchar not null primary key,
    username varchar not null,
    password varchar not null,
    photo varchar,
    lastLogin varchar,
    ipAddress varchar,
    userPlatform varchar
);
create index user_idx on users (email);

-- transaction
-- create table mpesa_transactions(
--     phoneNumber int not null,
--     amount int not null,
--     MerchantRequestID varchar not null primary key,
--     ResultCode varchar not null,
--     ResultDesc varchar not null,
--     MpesaReceiptNo varchar not null,
--     TransactionDate varchar not null
-- );
-- create index mpesa_idx on mpesa_transactions (MerchantRequestID);