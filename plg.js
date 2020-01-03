const {addSideEffect, addDefault} = require('@babel/helper-module-imports')
console.log('init')
 module.exports = function({ types: type }) {
  return {
    visitor: {
      VariableDeclaration(path, state) {
        path.node.kind = "let"
        addDefault(path, '/style/aa', { nameHint: "hintedName" })
      },
      ImportDeclaration(path, ref = { opts: {} }) {
        const specifiers = path.node.specifiers;
        const source = path.node.source;
        const libraryName = source.value;
        /**
         * 第二个判断条件是判断import语句里面有没有使用 import {xxx} 的语法，如果有，就替换
         * 不加这个条件的后果就是，死循环
         */
        if (libraryName === ref.opts.libraryName && specifiers.some(specifier => type.isImportSpecifier(specifier))) {
          const declarationNodes = [];
          specifiers.forEach(specifier => {
            /** 不是默认导入的
             *  为什么要这么判断，因为可能会有这种写法，import React, { Component } from 'react';
             */
            if (!type.isImportDefaultSpecifier(specifier)) {
              console.log('a')
              declarationNodes.push(
                /**
                 * importDeclaration 第一个参数是import xxx from module 里面的xxx
                 * xxx可以是 {yyy} => [importSpecifier], yyy => [importDefaultSpecifier], 空 => []
                 * 第二个参数是module字符串
                 */
                type.importDeclaration(
                  // 添加一个默认导入的 specifier，可以多个，这样就是import xxx, yyy from "test"
                  [type.importDefaultSpecifier(specifier.local)],
                  // type.stringLiteral 返回一个字面量字符串
                  type.stringLiteral( // {moduleName} 是在配置里面配置的，代表需要引入模块的名字
                    `${libraryName}${ref.opts.modulePath.replace('{moduleName}', specifier.local.name.toLowerCase())}`
                  )
                )
              );
              // 引入css 或者 less，可配置
              if (ref.opts.styleSuffix) {
                declarationNodes.push(
                  type.importDeclaration(
                    [], // 空的specifier, 这样就是 import from "xxxx"
                    type.stringLiteral(
                      `${libraryName}${ref.opts.stylePath
                        .replace('{moduleName}', specifier.local.name.toLowerCase())
                        .replace('{styleSuffix}', ref.opts.styleSuffix)}`
                    )
                  )
                );
              }
              return;
            }
            console.log('1', specifier.local)
            declarationNodes.push(
              type.importDeclaration([type.importDefaultSpecifier(specifier.local)], type.stringLiteral(libraryName))
            );
            console.log('declarationNodes', declarationNodes)
          });
          // 一个节点替换成多个
          path.replaceWithMultiple(declarationNodes);
        }
      }
    }
  };
}