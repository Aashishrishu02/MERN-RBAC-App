import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db';
import { Role, Permission } from './models/Role';
import { User } from './models/User';

dotenv.config();

export const seedDatabase = async (): Promise<void> => {
  try {
    if (mongoose.connection.readyState === 0) {
      await connectDB();
    }

    console.log('🌱 Starting Database Seeding...');

    // 1. Define Roles & Permissions
    const roleDefinitions = [
      {
        name: 'Owner',
        description: 'Full system administrative access and permission configuration capability',
        permissions: [
          Permission.READ_ALL_ATTENDANCE,
          Permission.READ_ALL_VISIT,
          Permission.MANAGE_ROLES,
        ],
        isDefault: false,
      },
      {
        name: 'Manager',
        description: 'Managerial role with access to review all attendance and visit records across team',
        permissions: [
          Permission.READ_SELF_ATTENDANCE,
          Permission.READ_ALL_ATTENDANCE,
          Permission.CLOCK_IN_OUT,
          Permission.READ_SELF_VISIT,
          Permission.READ_ALL_VISIT,
          Permission.SAVE_VISIT,
        ],
        isDefault: false,
      },
      {
        name: 'Field Employee',
        description: 'Field executive role capable of clocking attendance and registering field visits',
        permissions: [
          Permission.READ_SELF_ATTENDANCE,
          Permission.CLOCK_IN_OUT,
          Permission.READ_SELF_VISIT,
          Permission.SAVE_VISIT,
        ],
        isDefault: true,
      },
    ];

    const rolesMap: Record<string, mongoose.Types.ObjectId> = {};

    for (const def of roleDefinitions) {
      let role = await Role.findOne({ name: def.name });
      if (!role) {
        role = await Role.create(def);
        console.log(`✅ Created Role: ${def.name}`);
      } else {
        role.description = def.description;
        role.permissions = def.permissions;
        role.isDefault = def.isDefault;
        await role.save();
        console.log(`🔄 Updated Role: ${def.name}`);
      }
      rolesMap[def.name] = role._id as mongoose.Types.ObjectId;
    }

    // 2. Define Initial Demo Accounts
    const defaultPassword = 'Password123!';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    const userDefinitions = [
      {
        name: 'Alex Owner',
        email: 'owner@fieldops.com',
        password: hashedPassword,
        role: rolesMap['Owner'],
        customPermissions: [
          Permission.READ_ALL_ATTENDANCE,
          Permission.READ_ALL_VISIT,
          Permission.MANAGE_ROLES,
          Permission.MANAGE_USER_ACCOUNTS,
        ],
      },
      {
        name: 'Morgan Manager',
        email: 'manager@fieldops.com',
        password: hashedPassword,
        role: rolesMap['Manager'],
      },
      {
        name: 'Sam Employee',
        email: 'employee@fieldops.com',
        password: hashedPassword,
        role: rolesMap['Field Employee'],
      },
    ];

    for (const u of userDefinitions) {
      const user = await User.findOne({ email: u.email });
      if (!user) {
        await User.create(u);
        console.log(`👤 Created Demo User: ${u.email} (${u.name})`);
      } else {
        user.name = u.name;
        user.password = u.password;
        user.role = u.role;
        if (u.customPermissions) {
          user.customPermissions = u.customPermissions;
        }
        await user.save();
        console.log(`🔄 Updated Demo User: ${u.email}`);
      }
    }

    console.log('🎉 Database Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  seedDatabase().then(() => {
    mongoose.connection.close();
    process.exit(0);
  });
}
