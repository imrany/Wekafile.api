-- Add up migration script here
create table users(
    email varchar not null primary key,
    username varchar not null,
    password varchar not null,
    photo varchar,
    lastLogin varchar,
    ipAddress varchar,
    userPlatform varchar,
    group_ownership varchar
);
create index user_idx on users (email);

-- user_uploads table
create table user_uploads(
    filename varchar not null primary key,
    email varchar not null,
    allowedEmails varchar[],
    username varchar not null,
    uploadedAt varchar,
    size varchar,
    file varchar,
    type varchar
);
create index user_uploads_idx on user_uploads (email);

-- group table
create table groups(
    email varchar not null primary key,
    groupname varchar not null unique,
    grouptype varchar not null,
    photo varchar,
    privacy boolean,
    lastLogin varchar,
    ipAddress varchar,
    userPlatform varchar,
    members varchar[]
);
create index group_idx on groups (email);

-- group_uploads table
create table group_uploads(
    filename varchar not null,
    email varchar not null,
    allowedEmails varchar[],
    groupname varchar not null,
    uploadedAt varchar,
    size varchar,
    privacy boolean,
    file varchar primary key,
    type varchar
);
create index group_uploads_idx on group_uploads (email);
--  BYTEA
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