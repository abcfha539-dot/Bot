require('dotenv').config();
const { REST, Routes, SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) throw new Error('Set DISCORD_TOKEN and CLIENT_ID in .env');
const commands = [
 new SlashCommandBuilder().setName('setup-ticket').setDescription('إرسال لوحة التذاكر'),
 new SlashCommandBuilder().setName('server-status').setDescription('عرض حالة سيرفر MTA'),
 new SlashCommandBuilder().setName('ticket-close').setDescription('إغلاق التذكرة الحالية'),
 new SlashCommandBuilder().setName('warn').setDescription('إعطاء تحذير لعضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('السبب').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
 new SlashCommandBuilder().setName('warnings').setDescription('عرض تحذيرات عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
 new SlashCommandBuilder().setName('clear').setDescription('مسح رسائل').addIntegerOption(o=>o.setName('amount').setDescription('من 1 إلى 100').setRequired(true).setMinValue(1).setMaxValue(100)).setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
 new SlashCommandBuilder().setName('kick').setDescription('طرد عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('السبب')).setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
 new SlashCommandBuilder().setName('ban').setDescription('حظر عضو').addUserOption(o=>o.setName('member').setDescription('العضو').setRequired(true)).addStringOption(o=>o.setName('reason').setDescription('السبب')).setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
 new SlashCommandBuilder().setName('announce').setDescription('إرسال إعلان').addChannelOption(o=>o.setName('channel').setDescription('القناة').addChannelTypes(ChannelType.GuildText).setRequired(true)).addStringOption(o=>o.setName('message').setDescription('نص الإعلان').setRequired(true)).setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
].map(c=>c.toJSON());
(async()=>{const rest=new REST({version:'10'}).setToken(process.env.DISCORD_TOKEN); const route=process.env.GUILD_ID?Routes.applicationGuildCommands(process.env.CLIENT_ID,process.env.GUILD_ID):Routes.applicationCommands(process.env.CLIENT_ID); await rest.put(route,{body:commands}); console.log('تم تسجيل أوامر Nova RolePlay.');})().catch(e=>{console.error(e);process.exit(1)});
