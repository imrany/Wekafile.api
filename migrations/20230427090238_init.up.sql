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

-- group table
create table groups(
    email varchar not null primary key,
    groupname varchar not null,
    grouptype varchar not null,
    password varchar not null,
    photo varchar,
    lastLogin varchar,
    ipAddress varchar,
    userPlatform varchar
);
create index group_idx on groups (email);

-- sharedfiles table
create table sharedfiles(
    filename varchar not null primary key,
    email varchar not null,
    username varchar not null,
    uploadedAt varchar,
    size varchar,
    file varchar,
    type varchar,
    sharedTo int 
);
create index sharedfiles_idx on sharedfiles (email);

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