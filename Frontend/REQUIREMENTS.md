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
  - [x] Logic
  - [x] Visual
- Delete chanal if admin
  - [x] Logic
  - [x] Visual
- Invite to channel
  - [x] Logic
  - [x] Visual
- Two types of channels (Private and Public Channel)
  - [x] Logic
  - [x] Visual
- Admin is Channel creator
  - [x] Logic
  - [x] Visual
- Delete channel after 30 days of inactivity
  - [x] Logic
  - [x] Visual

### 3. Používateľ odosiela správy a príkazy cez "príkazový riadok", ktorý je "fixným" prvkom aplikácie. Používateľ môže odoslať správu v kanáli, ktorého je členom
- Chat Input always on screen
  - [x] Logic
  - [x] Visual
- Send messages with Input
  - [x] Logic
  - [x] Visual
- Send commans with Input
  - [x] Logic
  - [x] Visual

### 4. Vytvorenie komunikačného kanála (channel) cez príkazový riadok
- Create channel wiht **/join [ChannelName]**
  - [x] Logic
  - [x] Visual
- Invite to Private channel only by admin with **/invite [Username]**
  - [x] Logic
  - [x] Visual
- Kick to Private channel only by admin with **/revoke [Username]**
  - [x] Logic
  - [x] Visual
- Join to Public channel with **/join [ChannelName]**. If channel dont exist create one
  - [x] Logic
  - [x] Visual
- Invire to Public channel with **/invite [Username]**
  - [x] Logic
  - [x] Visual
- Ban to Public channel with **/kick [Username]**. Need to have 3 user vote or 1 admin vote
  - [x] Logic
  - [x] Visual
- Invite back after ban in Public channels only by admin with **/invite [Username]**
  - [x] Logic
  - [x] Visual
- Username and ChannelName are unique
  - [x] Logic
  - [x] Visual
- Delete channel only by admin with **/quit**
  - [x] Logic
  - [x] Visual

### 5. Používateľ môže zrušiť svoje členstvo v kanáli príkazom /cancel, ak tak spraví správca kanála, kanál zaniká
- Leave chnnel with **/cancel** command
  - [x] Logic
  - [x] Visual
- If admin leave channel, it deletes
  - [x] Logic
  - [x] Visual

### 6. Správu v kanáli je možné adresovať konkrétnemu používateľovi cez príkaz @nickname 
- Message can be addressed to user with **@[Username]**
  - [x] Logic
  - [x] Visual
- Addressed message will be highlight for user
  - [x] Logic
  - [x] Visual
  
### 7. Používateľ si môže pozrieť kompletnú históriu správ
- Load messages with Infinite Scroll
  - [x] Logic
  - [x] Visual

### 8. Používateľ je informovaný o každej novej správe prostredníctvom notifikácie
- Notification will send only if app not visible (use quasar App Visibility)
  - [x] Logic
  - [x] Visual
- Notification containt sender and part of message
  - [x] Logic
  - [x] Visual
- Setup to send only addressed messages
  - [ ] Logic
  - [ ] Visual

### 9. Používateľ si môže nastaviť stav (online, DND, offline)
- Status is displayed to the user
  - [x] Logic
  - [x] Visual
- If DND status is set, notifications do not arrive
  - [x] Logic
  - [x] Visual
- If the offline status is set, the used doesn't recive messages, after switching back load data
  - [x] Logic
  - [x] Visual

### 10. Používateľ si môže pozrieť zoznam členov kanála (ak je tiež členom kanála) príkazom /list
- Use **/list** to show all members
  - [ ] Logic
  - [x] Visual

### 11. Ak má používateľ aktívny niektorý z kanálov (nachádza sa v okne správ pre daný kanál) vidí v stavovej lište informáciu o tom, kto aktuálne píše správu (napr. Ed is typing) 
- Show nickname when someone typing
  - [x] Logic
  - [x] Visual
- After clicking on nickname, he can view the typing text in real time
  - [x] Logic
  - [ ] Visual

### Dátový model:
- Create JPG (JPEG) image of the logical data model (relational database) through migrations
  - [ ] Logic
  - [ ] Visual