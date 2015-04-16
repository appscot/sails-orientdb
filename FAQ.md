# FAQ (Frequently Asked Questions)


### Which version should I use?

The latest stable version in npm is always a safe bet.

```sh
npm install sails-orientdb --save
```

[![NPM](https://nodei.co/npm/sails-orientdb.png?downloads=true&stars=true)](https://nodei.co/npm/sails-orientdb/)



### Where is the documentation?
+ Documentation for this module is in the [README.md](./README.md) file.
+ Docs for the latest stable npm release of Waterline are on [balderdashy/waterline-docs](https://github.com/balderdashy/waterline-docs). Sails documentation itself is on [sailsjs.org](http://sailsjs.org/#!documentation).


### What happened to waterline-orientdb?
Srinath, Gaurav and Dário combined their efforts and now both are focused on developing a single Waterline/Sails OrientDB adapter, as such waterline-orientdb has been renamed **sails-orientdb**. More about this on the [README.md](./README.md#history).


### What is an adapter?

 Adapters expose **interfaces**, which imply a contract to implement certain functionality.  This allows us to guarantee conventional usage patterns across multiple models, developers, apps, and even companies, making app code more maintainable, efficient, and reliable.  Adapters are useful for integrating with databases, open APIs, internal/proprietary web services, or even hardware.



### How do I get involved?

+ [Contributing to this module](./CONTRIBUTING.md)
+ If you find a bug with this module, please submit an issue to the tracker in this repository.  Better yet, send a pull request :)



## Why would I need a custom adapter?

When building a Waterline / Sails app, the sending or receiving of any asynchronous communication with another piece of hardware can be normalized into an adapter.  (viz. API integrations)

> **From Wikipedia:**
> *http://en.wikipedia.org/wiki/Create,_read,_update_and_delete*

> Although a relational database provides a common persistence layer in software applications, numerous other persistence layers exist. CRUD functionality can be implemented with an object database, an XML database, flat text files, custom file formats, tape, or card, for example.

In other words, Waterline is not just an ORM for your database.  It is a purpose-agnostic, open standard and toolset for integrating with all kinds of RESTful services, datasources, and devices, whether it's LDAP, Neo4J, or [a lamp](https://www.youtube.com/watch?v=OmcQZD_LIAE).
I know, I know... Not everything fits perfectly into a RESTful/CRUD mold!  Sometimes the service you're integrating with has more of an RPC-style interface, with one-off method names. That's ok-- you can define any adapter methods you like! You still get all of the trickle-down config and connection-management goodness of Waterline core.



## What is an Adapter Interface?

The functionality of adapters is as varied as the services they connect.  That said, there is a standard library of methods, and a support matrix you should be aware of.  Adapters may implement some, all, or none of the interfaces below, but rest assured that **if an adapter implements one method in an interface, it should implement *all* of them**.  This is not always the case due to limitations and/or incomplete implementations, but at the very least, a descriptive error message should be used to keep developers informed of what's supported and what's not.

> For more information, check out the Sails docs, and specifically the [adapter interface reference](https://github.com/balderdashy/sails-docs/blob/master/adapter-specification.md).



### Where do I get help?

+ [Ask a question on StackOverflow](http://stackoverflow.com/questions/tagged/sailsjs?sort=newest&days=30)
+ Get help from the [Google Group](https://groups.google.com/forum/#!forum/sailsjs)
+ Get help on IRC ([#sailsjs on freenode](http://irc.netsplit.de/channels/details.php?room=%23sailsjs&net=freenode))
+ [Tweet @sailsjs](http://twitter.com/sailsjs)


### Why haven't I gotten a response to my feature request?

When people see something working in practice, they're usually a lot more down to get on board with it!  That's even more true in the open-source community, since most of us are not getting paid to do this (myself included).  The best feature request is a pull request-- even if you can't do the whole thing yourself, if you blueprint your thoughts, it'll help everyone understand what's going on.

### I want to make a sweeping change / add a major feature
It's always a good idea to contact the maintainer(s) of a module before doing a bunch of work.  This is even more true when it affects how things work / breaks backwards compatibility.

### The maintainer of this module won't merge my pull request.

Most of the time, when PRs don't get merged, a scarcity of time is to blame.  I can almost guarantee you it's nothing personal :)  And I can only speak for myself here, but in most cases, when someone follows up on a PR that's been sitting for a little while on Twitter, I don't mind the reminder at all.

The best thing about maintaining lots of small modules is that it's trivial to override any one of them on their own.  If you need some changes merged, please feel empowered to fork this model and release your own version.

If you feel that yours is the better approach, and should be the default, share it with the community via IRC, Twitter, Google Groups, etc.  Also, feel free to let the core Sails/Waterline team know and we'll take it into consideration.



### More questions?

> If you have an unanswered question that isn't covered here, and that you feel would add value for the community, please feel free to send a PR adding it to this section.

