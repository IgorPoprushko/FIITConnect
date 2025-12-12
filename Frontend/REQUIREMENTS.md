# Requirements

### 1. Registrácia, Prihlásenie a odhlásenie používateľa 
- Registration
  - [x] Logic
  - [x] Visual
- Login
  - [x] Logic
  - [x] Visual
- Logout
  - [x] Logic
  - [x] Visual

### 2. Používateľ vidí zoznam kanálov, v ktorých je členom 
- Channels List
  - [x] Logic
  - [x] Visual
- Create channel
  - [x] Logic
  - [x] Visual
- Leave channel
  - [ ] Logic
  - [x] Visual
- Delete chanal if admin
  - [ ] Logic
  - [ ] Visual
- Invite to channel
  - [ ] Logic
  - [ ] Visual
- Two types of channels (Private and Public Channel)
  - [ ] Logic
  - [ ] Visual
- Admin is Channel creator
  - [ ] Logic
  - [ ] Visual
- Delete channel after 30 days of inactivity
  - [ ] Logic
  - [ ] Visual

### 3. Používateľ odosiela správy a príkazy cez "príkazový riadok", ktorý je "fixným" prvkom aplikácie. Používateľ môže odoslať správu v kanáli, ktorého je členom
- Chat Input always on screen
  - [x] Logic
  - [x] Visual
- Send messages with Input
  - [ ] Logic
  - [x] Visual
- Send commans with Input
  - [ ] Logic
  - [x] Visual

### 4. Vytvorenie komunikačného kanála (channel) cez príkazový riadok
- Create channel wiht **/join [ChannelName]**
  - [ ] Logic
  - [x] Visual
- Invite to Private channel only by admin with **/invite [Username]**
  - [ ] Logic
  - [x] Visual
- Kick to Private channel only by admin with **/revoke [Username]**
  - [ ] Logic
  - [x] Visual
- Join to Public channel with **/join [ChannelName]**. If channel dont exist create one
  - [ ] Logic
  - [x] Visual
- Invire to Public channel with **/invite [Username]**
  - [ ] Logic
  - [x] Visual
- Ban to Public channel with **/kick [Username]**. Need to have 3 user vote or 1 admin vote
  - [ ] Logic
  - [x] Visual
- Invite back after ban in Public channels only by admin with **/invite [Username]**
  - [ ] Logic
  - [x] Visual
- Username and ChannelName are unique
  - [ ] Logic
  - [x] Visual
- Delete channel only by admin with **/quit**
  - [ ] Logic
  - [x] Visual

### 5. Používateľ môže zrušiť svoje členstvo v kanáli príkazom /cancel, ak tak spraví správca kanála, kanál zaniká
- Leave chnnel with **/cancel** command
  - [ ] Logic
  - [x] Visual
- If admin leave channel, it deletes
  - [ ] Logic
  - [ ] Visual

### 6. Správu v kanáli je možné adresovať konkrétnemu používateľovi cez príkaz @nickname 
- Message can be addressed to user with **@[Username]**
  - [ ] Logic
  - [x] Visual
- Addressed message will be highlight for user
  - [ ] Logic
  - [ ] Visual
  
### 7. Používateľ si môže pozrieť kompletnú históriu správ
- Load messages with Infinite Scroll
  - [ ] Logic
  - [ ] Visual

### 8. Používateľ je informovaný o každej novej správe prostredníctvom notifikácie
- Notification will send only if app not visible (use quasar App Visibility)
  - [ ] Logic
  - [ ] Visual
- Notification containt sender and part of message
  - [ ] Logic
  - [ ] Visual
- Setup to send only addressed messages
  - [ ] Logic
  - [ ] Visual

### ...